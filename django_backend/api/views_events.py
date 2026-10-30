import io
from datetime import datetime

import pandas as pd
from django.db import IntegrityError, transaction
from django.db.models import Count, F, Sum
from django.db.models.functions import Greatest
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .attendance import mark_attended, user_from_qr_token
from .models import Event, Participation, User, compute_title
from .pagination import paginated_response
from .permissions import IsAdminForWrites, IsBarangayAdmin
from .serializers import EventSerializer, ParticipationSerializer, PublicUserSerializer, UserSerializer
from .validators import ValidationError, clean_event_date, clean_int, clean_text

MAX_LOG_ROWS = 500
CLOSED_STATUSES = ('completed', 'cancelled')


def bad_request(message):
    return Response({"message": message}, status=status.HTTP_400_BAD_REQUEST)


def forbidden(message="Unauthorized"):
    return Response({"message": message}, status=status.HTTP_403_FORBIDDEN)


def clean_event_fields(data, partial=False, event=None):
    """Validate event input. With partial=True, missing fields keep their old value."""
    def pick(key):
        return data.get(key) if key in data else (getattr(event, key) if partial else None)

    category = pick('category') or 'General Cleanup'
    if category not in dict(Event.CATEGORY_CHOICES):
        raise ValidationError('Unknown event category.')

    date_value = pick('date')
    # When editing, an unchanged past date is allowed; a newly chosen one must be upcoming.
    allow_past = partial and event is not None and str(date_value) == str(event.date)

    return {
        'title': clean_text(pick('title'), 'Title', 100),
        'description': clean_text(pick('description'), 'Description', 2000),
        'location': clean_text(pick('location'), 'Location', 200),
        'date': clean_event_date(date_value, allow_past=allow_past),
        'time': clean_text(pick('time'), 'Time', 50),
        'points_reward': clean_int(pick('points_reward') if pick('points_reward') is not None else 10,
                                   'Points reward', min_value=1, max_value=500),
        'category': category,
    }


def admin_can_manage(user, event):
    return event.barangay == user.barangay or event.organizer_id == user.id


@api_view(['GET', 'POST'])
@permission_classes([IsAdminForWrites])
def handle_events(request):
    user = request.user
    if request.method == 'GET':
        if not user.is_verified and user.role == 'resident':
            return Response([], status=status.HTTP_200_OK)
        events = Event.objects.filter(barangay=user.barangay).order_by('-date', '-id')
        return paginated_response(request, events, EventSerializer)

    try:
        fields = clean_event_fields(request.data)
    except ValidationError as exc:
        return bad_request(str(exc))

    # Officials can only create events for their own barangay.
    new_event = Event.objects.create(organizer=user, barangay=user.barangay, **fields)
    return Response(EventSerializer(new_event).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsBarangayAdmin])
def get_global_logs(request):
    participations = (Participation.objects
                      .filter(event__barangay=request.user.barangay)
                      .select_related('user', 'event')
                      .order_by('-id')[:MAX_LOG_ROWS])
    log_data = []
    for p in participations:
        p_dict = ParticipationSerializer(p).data
        p_dict['user'] = UserSerializer(p.user).data
        p_dict['event'] = EventSerializer(p.event).data
        log_data.append(p_dict)
    return Response(log_data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsBarangayAdmin])
def get_barangay_stats(request):
    stats = (User.objects.filter(barangay=request.user.barangay, role='resident')
             .values('barangay')
             .annotate(total_points=Sum('points'), total_users=Count('id')))
    result = [{
        "barangay": s['barangay'] or "Unknown",
        "total_points": s['total_points'] or 0,
        "total_users": s['total_users'],
    } for s in stats]
    return Response(result, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_event(request, event_id):
    user = request.user
    if not user.is_verified and user.role == 'resident':
        return forbidden("Verification required to join events")

    event = get_object_or_404(Event, id=event_id)
    if event.barangay != user.barangay:
        return forbidden("This event belongs to a different barangay")
    if event.status in CLOSED_STATUSES:
        return bad_request("This event is no longer accepting participants")

    try:
        _, created = Participation.objects.get_or_create(user=user, event=event)
    except IntegrityError:
        created = False
    if not created:
        return bad_request("Already joined")
    return Response({"message": "Joined successfully"}, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def leave_event(request, event_id):
    """Let a resident cancel an event they joined but haven't attended yet."""
    event = get_object_or_404(Event, id=event_id)
    participation = Participation.objects.filter(user=request.user, event=event).first()
    if not participation:
        return bad_request("You have not joined this event")
    if participation.status == 'attended':
        return bad_request("Cannot cancel: attendance already verified")
    participation.delete()
    return Response({"message": "Successfully left the event"}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_participation(request):
    p_list = Participation.objects.filter(user=request.user).select_related('event').order_by('-id')
    result = []
    for p in p_list:
        p_dict = ParticipationSerializer(p).data
        p_dict['event'] = EventSerializer(p.event).data
        result.append(p_dict)
    return Response(result, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsBarangayAdmin])
def get_participants(request, event_id):
    event = get_object_or_404(Event, id=event_id)
    if not admin_can_manage(request.user, event):
        return forbidden("Unauthorized: Event belongs to a different barangay")

    p_list = Participation.objects.filter(event=event).select_related('user')
    result = []
    for p in p_list:
        p_dict = ParticipationSerializer(p).data
        p_dict['user'] = UserSerializer(p.user).data
        result.append(p_dict)
    return Response(result, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsBarangayAdmin])
def export_participants(request, event_id):
    """Excel attendance report: summary, attendees, and registered no-shows."""
    event = get_object_or_404(Event, id=event_id)
    if not admin_can_manage(request.user, event):
        return forbidden()

    participations = list(Participation.objects.filter(event=event)
                          .select_related('user', 'checked_in_by').order_by('attended_at', 'user__username'))
    attended = [p for p in participations if p.status == 'attended']
    no_shows = [p for p in participations if p.status != 'attended']
    method_label = {'qr': 'QR scan', 'manual': 'Manual'}

    def when(p):
        return timezone.localtime(p.attended_at).strftime('%Y-%m-%d %I:%M %p') if p.attended_at else (p.verified_at or '')

    attendees_df = pd.DataFrame([{
        'No.': i,
        'Username': p.user.username,
        'Email': p.user.email,
        'Phone Number': p.user.phone_number,
        'Checked in at': when(p),
        'Checked in by': p.checked_in_by.username if p.checked_in_by else '',
        'Method': method_label.get(p.checkin_method, 'Manual'),
        'Walk-in': 'Yes' if p.walk_in else 'No',
        'Points awarded': event.points_reward,
    } for i, p in enumerate(attended, start=1)], columns=['No.', 'Username', 'Email', 'Phone Number', 'Checked in at',
                                                          'Checked in by', 'Method', 'Walk-in', 'Points awarded'])
    no_show_df = pd.DataFrame([{
        'No.': i, 'Username': p.user.username, 'Email': p.user.email, 'Phone Number': p.user.phone_number,
    } for i, p in enumerate(no_shows, start=1)], columns=['No.', 'Username', 'Email', 'Phone Number'])
    summary_df = pd.DataFrame([
        ('Event', event.title), ('Category', event.category), ('Barangay', event.barangay),
        ('Date', event.date), ('Time', event.time), ('Location', event.location),
        ('Points per attendee', event.points_reward),
        ('Registered', len(participations) - sum(p.walk_in for p in participations)),
        ('Walk-ins', sum(p.walk_in for p in participations)),
        ('Attended', len(attended)), ('Did not attend', len(no_shows)),
        ('Total points awarded', len(attended) * event.points_reward),
        ('Exported by', request.user.username),
        ('Exported at', timezone.localtime().strftime('%Y-%m-%d %I:%M %p')),
    ], columns=['Item', 'Value'])

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        for name, df in (('Summary', summary_df), ('Attendees', attendees_df), ('Did not attend', no_show_df)):
            df.to_excel(writer, index=False, sheet_name=name)
            sheet = writer.sheets[name]
            for column in sheet.columns:  # readable column widths
                width = max(len(str(cell.value or '')) for cell in column)
                sheet.column_dimensions[column[0].column_letter].width = min(max(width + 2, 10), 45)
    output.seek(0)

    safe_title = "".join(c if c.isalnum() else '_' for c in event.title)[:40]
    filename = f"Attendance_{safe_title}_{event.date}.xlsx"
    response = HttpResponse(output.read(),
                            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@api_view(['POST'])
@permission_classes([IsBarangayAdmin])
def verify_attendance(request, participation_id):
    """Manually mark attendance; points are awarded exactly once, even with two officials clicking."""
    with transaction.atomic():
        # Row lock: a second concurrent request waits here, then sees 'attended'.
        p = get_object_or_404(Participation.objects.select_for_update().select_related('event'),
                              id=participation_id)
        if not admin_can_manage(request.user, p.event):
            return forbidden("Unauthorized: Participation belongs to a different barangay")
        if p.status == 'attended':
            return bad_request("Already verified")
        mark_attended(p, request.user, 'manual')
    return Response({"message": "Attendance verified and points awarded"}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsBarangayAdmin])
def qr_check_in(request, event_id):
    """Check a resident in by scanning their QR code. Walk-ins are added on the spot."""
    event = get_object_or_404(Event, id=event_id)
    if not admin_can_manage(request.user, event):
        return forbidden("This event belongs to a different barangay")
    if event.status == 'cancelled':
        return bad_request("This event was cancelled")

    member = user_from_qr_token(request.data.get('token'))
    if not member:
        return Response({"result": "invalid", "message": "This QR code isn't valid. Ask the resident to open a fresh code in the app."},
                        status=status.HTTP_400_BAD_REQUEST)
    person = {"id": member.id, "username": member.username, "profile_picture": member.profile_picture}
    if member.role != 'resident':
        return Response({"result": "invalid", "message": "Only residents can be checked in.", "user": person},
                        status=status.HTTP_400_BAD_REQUEST)
    if member.barangay != event.barangay:
        return Response({"result": "other_barangay", "message": f"{member.username} is registered in {member.barangay}, not {event.barangay}.",
                         "user": person}, status=status.HTTP_400_BAD_REQUEST)
    if not member.is_verified:
        return Response({"result": "unverified", "message": f"{member.username}'s ID hasn't been verified yet. Verify it first, then scan again.",
                         "user": person}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        p, created = Participation.objects.select_for_update().get_or_create(
            user=member, event=event, defaults={'walk_in': True})
        if p.status == 'attended':
            return Response({"result": "already", "message": f"{member.username} is already checked in.",
                             "user": person, "walk_in": p.walk_in}, status=status.HTTP_200_OK)
        points = mark_attended(p, request.user, 'qr')

    return Response({"result": "checked_in", "message": f"{member.username} checked in · +{points} pts",
                     "user": person, "points_awarded": points, "walk_in": created}, status=status.HTTP_200_OK)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsBarangayAdmin])
def event_detail(request, event_id):
    event = get_object_or_404(Event, id=event_id)
    if not admin_can_manage(request.user, event):
        return forbidden("Unauthorized: Event belongs to a different barangay")

    if request.method == 'PUT':
        try:
            fields = clean_event_fields(request.data, partial=True, event=event)
        except ValidationError as exc:
            return bad_request(str(exc))
        for key, value in fields.items():
            setattr(event, key, value)
        event.save()
        return Response(EventSerializer(event).data, status=status.HTTP_200_OK)

    with transaction.atomic():
        attendee_ids = list(Participation.objects.filter(event=event, status='attended')
                            .values_list('user_id', flat=True))
        User.objects.filter(pk__in=attendee_ids).update(
            points=Greatest(F('points') - event.points_reward, 0))
        for member in User.objects.filter(pk__in=attendee_ids):
            member.title = compute_title(member.points)
            member.save(update_fields=['title'])
        event.delete()
    return Response({"message": "Event deleted and points reversed for attendees"}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_leaderboard(request):
    user = request.user
    query = User.objects.filter(role='resident')

    # Signed-in users always see their own barangay; visitors must name one.
    if user.is_authenticated:
        query = query.filter(barangay=user.barangay)
    else:
        query = query.filter(barangay=request.query_params.get('barangay') or '')

    users = query.order_by('-points', 'username')[:20]
    return Response(PublicUserSerializer(users, many=True).data, status=status.HTTP_200_OK)
