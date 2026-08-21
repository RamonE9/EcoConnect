from django.urls import path
from .views_auth import (
    register, login, forgot_password, reset_password, 
    get_all_users, export_residents, verify_user, get_current_user,
    get_barangay_officials, update_profile, search_users
)
from .views_events import (
    handle_events, get_global_logs, get_barangay_stats, join_event,
    get_my_participation, get_participants, export_participants,
    verify_attendance, event_detail, get_leaderboard
)
from .views_extras import (
    handle_redemptions, approve_redemption,
    handle_expenses, get_expense_summary,
    handle_transfer_requests, get_incoming_transfers,
    handle_transfer_decision, direct_transfer
)
from .views_ai import eco_assistant_chat, smart_scheduling_advice, personalized_eco_tips, smart_reminders

urlpatterns = [
    path('ai/chat/', eco_assistant_chat, name='ai_chat'),
    path('ai/scheduling/', smart_scheduling_advice, name='ai_scheduling'),
    path('ai/tips/', personalized_eco_tips, name='ai_tips'),
    path('ai/reminders/', smart_reminders, name='ai_reminders'),

    path('auth/register', register, name='register'),
    path('auth/login', login, name='login'),
    path('auth/forgot-password', forgot_password, name='forgot_password'),
    path('auth/reset-password', reset_password, name='reset_password'),
    path('auth/users', get_all_users, name='get_all_users'),
    path('auth/users/export', export_residents, name='export_residents'),
    path('auth/users/verify/<int:user_id>', verify_user, name='verify_user'),
    path('auth/me', get_current_user, name='get_current_user'),
    path('auth/barangay/officials', get_barangay_officials, name='get_barangay_officials'),
    path('auth/profile/update', update_profile, name='update_profile'),
    path('auth/users/search', search_users, name='search_users'),
    path('auth/transfer/my-requests', handle_transfer_requests, name='my_transfer_requests'),
    path('auth/transfer/request', handle_transfer_requests, name='request_transfer'),
    path('auth/transfer/incoming', get_incoming_transfers, name='incoming_transfers'),
    path('auth/transfer/decision', handle_transfer_decision, name='transfer_decision'),
    path('auth/users/transfer/<int:user_id>', direct_transfer, name='direct_transfer'),

    path('events/', handle_events, name='handle_events'),
    path('events/global-logs', get_global_logs, name='get_global_logs'),
    path('events/barangay-stats', get_barangay_stats, name='get_barangay_stats'),
    path('events/join/<int:event_id>', join_event, name='join_event'),
    path('events/my-participation', get_my_participation, name='get_my_participation'),
    path('events/participants/<int:event_id>', get_participants, name='get_participants'),
    path('events/<int:event_id>/participants/export', export_participants, name='export_participants'),
    path('events/verify/<int:participation_id>', verify_attendance, name='verify_attendance'),
    path('events/<int:event_id>', event_detail, name='event_detail'),
    path('events/leaderboard', get_leaderboard, name='get_leaderboard'),

    path('finance/redemption/history', handle_redemptions, name='redemption_history'),
    path('finance/redemption/request', handle_redemptions, name='redemption_request'),
    path('finance/redemption/approve/<int:redemption_id>', approve_redemption, name='approve_redemption'),
    path('finance/expenses', handle_expenses, name='handle_expenses'),
    path('finance/expenses/summary', get_expense_summary, name='expense_summary'),
]
