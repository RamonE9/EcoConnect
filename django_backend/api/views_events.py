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
    event = get_object_or_404(Event, id=event_id)
    if not admin_can_manage(request.user, event):
        return forbidden()

    rows = []
    for p in Participation.objects.filter(event=event).select_related('user').iterator():
        u = p.user
        rows.append({
            "Username": u.username,
            "Email": u.email,
            "Phone Number": u.phone_number,
            "Barangay": u.barangay,
            "Participation Status": p.status,
            "Verified At": p.verified_at or "Not Verified",
        })

    df = pd.DataFrame(rows, columns=["Username", "Email", "Phone Number", "Barangay",
                                     "Participation Status", "Verified At"])
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Event Participants')
    output.seek(0)

    safe_title = "".join(c if c.isalnum() else '_' for c in event.title)[:40]
    filename = f"Participants_{safe_title}_{timezone.now().strftime('%Y%m%d')}.xlsx"
    response = HttpResponse(output.read(),
                            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename={filename}'
    return response


@api_view(['POST'])
@permission_classes([IsBarangayAdmin])
def verify_attendance(request, participation_id):
    """Mark attendance and award points exactly once, even if two officials click together."""
    with transaction.atomic():
        # Row lock: a second concurrent request waits here, then sees 'attended'.
        p = get_object_or_404(Participation.objects.select_for_update().select_related('event'),
                              id=participation_id)
        event = p.event
        if not admin_can_manage(request.user, event):
            return forbidden("Unauthorized: Participation belongs to a different barangay")
        if p.status == 'attended':
            return bad_request("Already verified")

        p.status = 'attended'
        p.verified_at = datetime.now().strftime("%Y-%m-%d %I:%M:%S %p")
        p.save(update_fields=['status', 'verified_at'])

        User.objects.filter(pk=p.user_id).update(points=F('points') + event.points_reward)
        member = User.objects.get(pk=p.user_id)
        member.title = compute_title(member.points)
        member.save(update_fields=['title'])

    return Response({"message": "Attendance verified and points awarded"}, status=status.HTTP_200_OK)


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
