from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views_auth import (
    register, register_send_code, register_verify_code, login, forgot_password, verify_otp, reset_password,
    get_all_users, export_residents, verify_user, get_current_user,
    get_barangay_officials, update_profile, award_points,
    get_id_image, serve_private_media, replace_id_image, my_point_awards,
)
from .views_events import (
    handle_events, get_global_logs, get_barangay_stats, join_event, leave_event,
    get_my_participation, get_participants, export_participants,
    verify_attendance, event_detail, get_leaderboard, qr_check_in, my_ticket, set_event_status
)
from .views_extras import (
    handle_redemptions, approve_redemption, reject_redemption, redemption_qr, scan_redemption,
    handle_transfer_requests, get_incoming_transfers,
    handle_transfer_decision, direct_transfer,
    handle_incentives, incentive_detail
)
from .views_reports import statistics_report
from .views_ai import eco_assistant_chat, smart_scheduling_advice, personalized_eco_tips, smart_reminders

urlpatterns = [
    path('ai/chat/', eco_assistant_chat, name='ai_chat'),
    path('ai/scheduling/', smart_scheduling_advice, name='ai_scheduling'),
    path('ai/tips/', personalized_eco_tips, name='ai_tips'),
    path('ai/reminders/', smart_reminders, name='ai_reminders'),

    path('auth/register', register, name='register'),
    path('auth/register/send-code', register_send_code, name='register_send_code'),
    path('auth/register/verify-code', register_verify_code, name='register_verify_code'),
    path('auth/login', login, name='login'),
    path('auth/forgot-password', forgot_password, name='forgot_password'),
    path('auth/verify-otp', verify_otp, name='verify_otp'),
    path('auth/reset-password', reset_password, name='reset_password'),
    path('auth/token/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/users', get_all_users, name='get_all_users'),
    path('auth/users/export', export_residents, name='export_residents'),
    path('auth/users/verify/<int:user_id>', verify_user, name='verify_user'),
    path('auth/users/<int:user_id>/award-points', award_points, name='award_points'),
    path('auth/users/<int:user_id>/id-image', get_id_image, name='get_id_image'),
    path('media/private/<str:token>', serve_private_media, name='serve_private_media'),
    path('auth/me', get_current_user, name='get_current_user'),
    path('auth/barangay/officials', get_barangay_officials, name='get_barangay_officials'),
    path('auth/profile/update', update_profile, name='update_profile'),
    path('auth/profile/id-image', replace_id_image, name='replace_id_image'),
    path('auth/me/point-awards', my_point_awards, name='my_point_awards'),
    path('auth/transfer/my-requests', handle_transfer_requests, name='my_transfer_requests'),
    path('auth/transfer/request', handle_transfer_requests, name='request_transfer'),
    path('auth/transfer/incoming', get_incoming_transfers, name='incoming_transfers'),
    path('auth/transfer/decision', handle_transfer_decision, name='transfer_decision'),
    path('auth/users/transfer/<int:user_id>', direct_transfer, name='direct_transfer'),

    path('events/', handle_events, name='handle_events'),
    path('events/global-logs', get_global_logs, name='get_global_logs'),
    path('events/barangay-stats', get_barangay_stats, name='get_barangay_stats'),
    path('events/join/<int:event_id>', join_event, name='join_event'),
    path('events/leave/<int:event_id>', leave_event, name='leave_event'),
    path('events/my-participation', get_my_participation, name='get_my_participation'),
    path('events/participants/<int:event_id>', get_participants, name='get_participants'),
    path('events/<int:event_id>/participants/export', export_participants, name='export_participants'),
    path('events/verify/<int:participation_id>', verify_attendance, name='verify_attendance'),
    path('events/<int:event_id>/check-in', qr_check_in, name='qr_check_in'),
    path('events/<int:event_id>/ticket', my_ticket, name='my_ticket'),
    path('events/<int:event_id>/status', set_event_status, name='set_event_status'),
    path('events/<int:event_id>', event_detail, name='event_detail'),
    path('events/leaderboard', get_leaderboard, name='get_leaderboard'),

    path('finance/redemption/history', handle_redemptions, name='redemption_history'),
    path('finance/redemption/request', handle_redemptions, name='redemption_request'),
    path('finance/redemption/approve/<int:redemption_id>', approve_redemption, name='approve_redemption'),
    path('finance/redemption/reject/<int:redemption_id>', reject_redemption, name='reject_redemption'),
    path('finance/redemption/<int:redemption_id>/qr', redemption_qr, name='redemption_qr'),
    path('finance/redemption/scan', scan_redemption, name='scan_redemption'),

    path('incentives/', handle_incentives, name='handle_incentives'),
    path('incentives/<int:incentive_id>', incentive_detail, name='incentive_detail'),

    path('reports/statistics', statistics_report, name='statistics_report'),
]
