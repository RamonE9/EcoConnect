SECTIONS = [
    ('/api/auth/users', 'Residents (officials)'),
    ('/api/auth/transfer', 'Barangay transfers'),
    ('/api/auth/', 'Authentication & account'),
    ('/api/events/leaderboard', 'Authentication & account'),
    ('/api/events/barangay-stats', 'Reports & statistics'),
    ('/api/events/', 'Events & attendance'),
    ('/api/incentives/', 'Rewards & claims'),
    ('/api/finance/', 'Rewards & claims'),
    ('/api/ai/', 'AI Eco Assistant'),
    ('/api/reports/', 'Reports & statistics'),
]

SUMMARIES = {
    ('/api/auth/login', 'post'): 'Sign in; returns access and refresh tokens and the user',
    ('/api/auth/token/refresh', 'post'): 'Get a new access token from a refresh token',
    ('/api/auth/register/send-code', 'post'): 'Check sign-up details and send the SMS code',
    ('/api/auth/register/verify-code', 'post'): 'Check the sign-up code',
    ('/api/auth/register', 'post'): 'Create a resident account (with valid ID photo)',
    ('/api/auth/forgot-password', 'post'): 'Send a password reset code',
    ('/api/auth/verify-otp', 'post'): 'Check the reset code',
    ('/api/auth/reset-password', 'post'): 'Set a new password',
    ('/api/auth/me', 'get'): 'Your own profile',
    ('/api/auth/profile/update', 'post'): 'Edit name, username, email, phone, password or photo',
    ('/api/auth/profile/update', 'put'): 'Edit name, username, email, phone, password or photo',
    ('/api/auth/profile/id-image', 'post'): 'Replace your valid ID photo',
    ('/api/auth/me/point-awards', 'get'): 'Your bonus point history',
    ('/api/auth/barangay/officials', 'get'): 'Officials of your barangay',
    ('/api/auth/users/{user_id}/id-image', 'get'): 'Get a 5-minute link to a valid ID (owner or their official)',
    ('/api/events/leaderboard', 'get'): 'Top 20 residents of a barangay (public: ?barangay=Name)',
    ('/api/auth/users', 'get'): 'Residents of your barangay',
    ('/api/auth/users/export', 'get'): 'Residents list as Excel',
    ('/api/auth/users/verify/{user_id}', 'post'): "Verify or revoke a resident's ID",
    ('/api/auth/users/{user_id}/award-points', 'post'): 'Give bonus points (1-500)',
    ('/api/auth/users/transfer/{user_id}', 'post'): 'Move one of your residents to another barangay',
    ('/api/auth/transfer/my-requests', 'get'): 'Your transfer requests',
    ('/api/auth/transfer/my-requests', 'post'): 'Ask to move to another barangay',
    ('/api/auth/transfer/request', 'get'): 'Your transfer requests',
    ('/api/auth/transfer/request', 'post'): 'Ask to move to another barangay',
    ('/api/auth/transfer/incoming', 'get'): 'Requests to join your barangay',
    ('/api/auth/transfer/decision', 'post'): 'Approve or reject a transfer request',
    ('/api/events/', 'get'): 'Events in your barangay',
    ('/api/events/', 'post'): 'Create an event (officials)',
    ('/api/events/{event_id}', 'put'): 'Edit an event',
    ('/api/events/{event_id}', 'delete'): 'Delete an event (reverses points awarded)',
    ('/api/events/{event_id}/status', 'post'): 'Mark an event as done or reopen it',
    ('/api/events/join/{event_id}', 'post'): 'Join an event; issues a ticket',
    ('/api/events/leave/{event_id}', 'delete'): 'Cancel participation',
    ('/api/events/my-participation', 'get'): 'Events you joined',
    ('/api/events/{event_id}/ticket', 'get'): 'Your ticket QR and code',
    ('/api/events/participants/{event_id}', 'get'): 'Participant list',
    ('/api/events/{event_id}/check-in', 'post'): 'Check in by scanned QR or typed code',
    ('/api/events/verify/{participation_id}', 'post'): 'Manual check-in',
    ('/api/events/{event_id}/participants/export', 'get'): 'Attendance report as Excel',
    ('/api/events/global-logs', 'get'): 'Activity log (joins and attendance)',
    ('/api/incentives/', 'get'): 'Rewards catalog',
    ('/api/incentives/', 'post'): 'Add a reward (officials)',
    ('/api/incentives/{incentive_id}', 'put'): 'Edit a reward',
    ('/api/incentives/{incentive_id}', 'delete'): 'Remove a reward',
    ('/api/finance/redemption/request', 'post'): 'Reserve a reward; deducts points and stock',
    ('/api/finance/redemption/request', 'get'): 'Your claims (officials: their barangay)',
    ('/api/finance/redemption/history', 'get'): 'Claims; search with ?status=Claimed&q=name&start=&end= (officials: their barangay)',
    ('/api/finance/redemption/history', 'post'): 'Reserve a reward; deducts points and stock',
    ('/api/finance/redemption/{redemption_id}/qr', 'get'): 'Your pickup QR and code',
    ('/api/finance/redemption/scan', 'post'): 'Release a reward by scanned QR or typed code',
    ('/api/finance/redemption/approve/{redemption_id}', 'post'): 'Release a reward manually',
    ('/api/finance/redemption/reject/{redemption_id}', 'post'): 'Reject a claim; refunds points and stock',
    ('/api/ai/chat/', 'post'): 'Chat with the AI Eco Assistant (Gemini)',
    ('/api/ai/tips/', 'get'): 'Eco tip for your barangay',
    ('/api/ai/reminders/', 'get'): 'What to bring to events you joined',
    ('/api/ai/scheduling/', 'get'): 'Scheduling suggestion for officials',
    ('/api/events/barangay-stats', 'get'): 'Resident and point totals for your barangay',
    ('/api/reports/statistics', 'get'): 'Statistics report as Excel (?start=YYYY-MM-DD&end=YYYY-MM-DD)',
    ('/api/reports/events', 'get'): 'Searchable event report (?q=&category=&status=&start=&end=; &export=xlsx for Excel)',
}

SECTION_ORDER = ['Authentication & account', 'Residents (officials)', 'Barangay transfers', 'Events & attendance',
                 'Rewards & claims', 'AI Eco Assistant', 'Reports & statistics']


def section_for(path):
    for prefix, name in SECTIONS:
        if path == prefix or path.startswith(prefix):
            return name
    return 'Other'


def add_summaries(result, generator, request, public):
    for path, operations in result.get('paths', {}).items():
        for method, operation in operations.items():
            if not isinstance(operation, dict):
                continue
            operation['tags'] = [section_for(path)]
            summary = SUMMARIES.get((path, method))
            if summary:
                operation['summary'] = summary
    result['tags'] = [{'name': name} for name in SECTION_ORDER]
    return result
