"""System statistics report for barangay officials, downloaded as an Excel file.

Covers every feature (residents, events, attendance, bonus points, rewards,
transfers, leaderboard) for the official's own barangay, either for a date
range or overall since the system started.
"""
import io
from datetime import datetime

import pandas as pd
from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Event, Incentive, Participation, PointAward, Redemption, TransferRequest, User, compute_title
from .permissions import IsBarangayAdmin

EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'


def parse_day(value, label):
    if not value:
        return None
    try:
        return datetime.strptime(value, '%Y-%m-%d').date()
    except ValueError:
        raise ValueError(f"{label} must be a date in YYYY-MM-DD format.")


def local_time(value):
    return timezone.localtime(value).strftime('%Y-%m-%d %I:%M %p') if value else ''


def in_range(queryset, field, start, end):
    """Filter a queryset by a date or datetime field; open ends are not filtered."""
    if start:
        queryset = queryset.filter(**{f'{field}__gte': start})
    if end:
        queryset = queryset.filter(**{f'{field}__lte': end})
    return queryset


def percent(part, whole):
    return f"{round(part / whole * 100, 1)}%" if whole else '0%'


def write_workbook(sheets):
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        for name, df in sheets:
            df.to_excel(writer, index=False, sheet_name=name)
            sheet = writer.sheets[name]
            sheet.freeze_panes = 'A2'
            for column in sheet.columns:  # readable column widths
                width = max(len(str(cell.value or '')) for cell in column)
                sheet.column_dimensions[column[0].column_letter].width = min(max(width + 2, 10), 50)
    output.seek(0)
    return output.read()


@api_view(['GET'])
@permission_classes([IsBarangayAdmin])
def statistics_report(request):
    """GET ?start=YYYY-MM-DD&end=YYYY-MM-DD (both optional; none = overall)."""
    official = request.user
    barangay = official.barangay
    try:
        start = parse_day(request.query_params.get('start'), 'Start date')
        end = parse_day(request.query_params.get('end'), 'End date')
    except ValueError as exc:
        return Response({"message": str(exc)}, status=400)
    if start and end and start > end:
        return Response({"message": "Start date must be on or before the end date."}, status=400)

    overall = not start and not end
    period = 'Overall (since the system started)' if overall else f"{start or 'the beginning'} to {end or 'today'}"

    # ── Data for the period ──────────────────────────────────────────────────
    all_residents = User.objects.filter(barangay=barangay, role='resident')
    new_residents = in_range(all_residents, 'date_joined__date', start, end).order_by('date_joined')

    events = in_range(Event.objects.filter(barangay=barangay), 'date', start and str(start), end and str(end))
    events = (events.select_related('organizer')
              .annotate(joined=Count('participants'),
                        attended=Count('participants', filter=Q(participants__status='attended')))
              .order_by('date', 'time'))
    participations = (Participation.objects.filter(event__in=events)
                      .select_related('user', 'event', 'checked_in_by').order_by('event__date', 'user__username'))
    attended = [p for p in participations if p.status == 'attended']

    awards = in_range(PointAward.objects.filter(user__barangay=barangay), 'created_at__date', start, end) \
        .select_related('user', 'awarded_by').order_by('created_at')
    claims = in_range(Redemption.objects.filter(user__barangay=barangay), 'timestamp__date', start, end) \
        .select_related('user').order_by('timestamp')
    transfers = in_range(TransferRequest.objects.filter(Q(source_barangay=barangay) | Q(target_barangay=barangay)),
                         'created_at__date', start, end).select_related('user').order_by('created_at')
    catalog = Incentive.objects.filter(barangay=barangay).order_by('name')
    leaders = all_residents.order_by('-points', 'username')[:50]

    # ── Summary numbers ──────────────────────────────────────────────────────
    event_points = sum(p.event.points_reward for p in attended)
    award_points = sum(a.points for a in awards)
    claim_status = {s: sum(1 for c in claims if c.status == s) for s in ('Pending', 'Claimed', 'Rejected')}
    claimed_points = sum(c.points_spent for c in claims if c.status in ('Pending', 'Claimed'))
    transfers_in = [t for t in transfers if t.target_barangay == barangay]
    transfers_out = [t for t in transfers if t.source_barangay == barangay]
    events_done = sum(1 for e in events if e.status == 'completed')

    summary = [
        ('REPORT', ''),
        ('Barangay', barangay),
        ('Period', period),
        ('Generated by', official.username),
        ('Generated at', local_time(timezone.now())),
        ('', ''),
        ('RESIDENTS', ''),
        ('Registered residents (all time)', all_residents.count()),
        ('Verified residents (all time)', all_residents.filter(is_verified=True).count()),
        ('Awaiting verification (now)', all_residents.filter(is_verified=False).count()),
        ('New sign-ups in period', new_residents.count()),
        ('', ''),
        ('EVENTS', ''),
        ('Events in period', len(events)),
        ('Events marked done', events_done),
        ('Events still open', len(events) - events_done),
        ('Registrations', len(participations)),
        ('Attended', len(attended)),
        ('Attendance rate', percent(len(attended), len(participations))),
        ('Unique residents who attended', len({p.user_id for p in attended})),
        ('', ''),
        ('ECO-POINTS', ''),
        ('Points earned from events', event_points),
        ('Bonus points awarded by officials', award_points),
        ('Total points given', event_points + award_points),
        ('Points spent on rewards (pending + claimed)', claimed_points),
        ('Points currently held by residents (now)', sum(all_residents.values_list('points', flat=True))),
        ('', ''),
        ('REWARDS', ''),
        ('Reward claims', len(claims)),
        ('Pending claims', claim_status['Pending']),
        ('Released (claimed)', claim_status['Claimed']),
        ('Rejected', claim_status['Rejected']),
        ('Items released', sum(c.quantity for c in claims if c.status == 'Claimed')),
        ('Rewards in catalog (now)', catalog.count()),
        ('', ''),
        ('TRANSFERS', ''),
        ('Transfer requests into this barangay', len(transfers_in)),
        ('Transfer requests out of this barangay', len(transfers_out)),
        ('Approved transfers', sum(1 for t in transfers if t.status == 'Approved')),
    ]
    sheets = [('Summary', pd.DataFrame(summary, columns=['Item', 'Value']))]

    # ── Detail sheets ────────────────────────────────────────────────────────
    category_rows = {}
    for e in events:
        row = category_rows.setdefault(e.category, {'Category': e.category, 'Events': 0, 'Registrations': 0, 'Attended': 0})
        row['Events'] += 1
        row['Registrations'] += e.joined
        row['Attended'] += e.attended
    for row in category_rows.values():
        row['Attendance rate'] = percent(row['Attended'], row['Registrations'])
    sheets.append(('Event categories', pd.DataFrame(
        sorted(category_rows.values(), key=lambda r: -r['Events']),
        columns=['Category', 'Events', 'Registrations', 'Attended', 'Attendance rate'])))

    sheets.append(('Events', pd.DataFrame([{
        'Title': e.title, 'Category': e.category, 'Date': e.date, 'Time': e.time, 'Location': e.location,
        'Status': 'Done' if e.status == 'completed' else 'Open', 'Points per attendee': e.points_reward,
        'Participant limit': e.max_participants or 'No limit', 'Registered': e.joined, 'Attended': e.attended,
        'Attendance rate': percent(e.attended, e.joined), 'Points given': e.attended * e.points_reward,
        'Organizer': e.organizer.username if e.organizer else '',
    } for e in events], columns=['Title', 'Category', 'Date', 'Time', 'Location', 'Status', 'Points per attendee',
                                 'Participant limit', 'Registered', 'Attended', 'Attendance rate', 'Points given',
                                 'Organizer'])))

    method_label = {'qr': 'QR scan', 'manual': 'Manual'}
    sheets.append(('Attendance', pd.DataFrame([{
        'Event': p.event.title, 'Event date': p.event.date, 'Resident': p.user.username,
        'Status': 'Attended' if p.status == 'attended' else 'Registered, did not attend',
        'Checked in at': local_time(p.attended_at) or (p.verified_at or ''),
        'Method': method_label.get(p.checkin_method, 'Manual') if p.status == 'attended' else '',
        'Checked in by': p.checked_in_by.username if p.checked_in_by else '',
    } for p in participations], columns=['Event', 'Event date', 'Resident', 'Status', 'Checked in at', 'Method',
                                         'Checked in by'])))

    attended_by_user = {}
    for p in attended:
        attended_by_user[p.user_id] = attended_by_user.get(p.user_id, 0) + 1
    sheets.append(('New residents', pd.DataFrame([{
        'Username': u.username, 'Email': u.email, 'Phone number': u.phone_number,
        'Signed up': local_time(u.date_joined), 'Verified': 'Yes' if u.is_verified else 'No',
        'Points': u.points, 'Title': compute_title(u.achievement_points) or 'None yet',
    } for u in new_residents], columns=['Username', 'Email', 'Phone number', 'Signed up', 'Verified', 'Points', 'Title'])))

    sheets.append(('Bonus points', pd.DataFrame([{
        'Date': local_time(a.created_at), 'Resident': a.user.username, 'Points': a.points, 'Reason': a.reason,
        'Awarded by': a.awarded_by.username if a.awarded_by else '',
    } for a in awards], columns=['Date', 'Resident', 'Points', 'Reason', 'Awarded by'])))

    sheets.append(('Reward claims', pd.DataFrame([{
        'Date': local_time(c.timestamp), 'Resident': c.user.username, 'Reward': c.item_name,
        'Quantity': c.quantity, 'Points spent': c.points_spent, 'Status': c.status,
    } for c in claims], columns=['Date', 'Resident', 'Reward', 'Quantity', 'Points spent', 'Status'])))

    sheets.append(('Rewards catalog', pd.DataFrame([{
        'Reward': i.name, 'Points cost': i.points_cost, 'Stock left': i.stock, 'Max per claim': i.max_per_claim,
        'Available': 'Yes' if i.is_active else 'No',
    } for i in catalog], columns=['Reward', 'Points cost', 'Stock left', 'Max per claim', 'Available'])))

    sheets.append(('Transfers', pd.DataFrame([{
        'Date': local_time(t.created_at), 'Resident': t.user.username,
        'Direction': 'Into this barangay' if t.target_barangay == barangay else 'Out of this barangay',
        'From': t.source_barangay, 'To': t.target_barangay, 'Reason': t.reason or '', 'Status': t.status,
    } for t in transfers], columns=['Date', 'Resident', 'Direction', 'From', 'To', 'Reason', 'Status'])))

    sheets.append(('Leaderboard', pd.DataFrame([{
        'Rank': rank, 'Resident': u.username, 'Points': u.points,
        'Title': compute_title(u.achievement_points) or 'None yet',
        'Drives attended in period': attended_by_user.get(u.id, 0),
    } for rank, u in enumerate(leaders, start=1)], columns=['Rank', 'Resident', 'Points', 'Title',
                                                             'Drives attended in period'])))

    suffix = 'Overall' if overall else f"{start or 'start'}_to_{end or 'today'}"
    response = HttpResponse(write_workbook(sheets), content_type=EXCEL_TYPE)
    response['Content-Disposition'] = f'attachment; filename="EcoConnect_Report_{barangay}_{suffix}.xlsx"'
    return response
