from .models import TITLE_THRESHOLDS

SYSTEM_GUIDE = """ECOCONNECT GUIDE (how the app works)
Roles
- Residents sign up in the app. Barangay officials are created by the system administrator. Everyone signs in on the
  same page and the app opens the right dashboard for their role.
- Officials only see and manage their own barangay. Residents only see their own records.
Sign-up and account
- Sign up with first and last name, username, email, mobile number, password, barangay and a photo of a valid ID,
  and agree to the Data Privacy Policy (RA 10173).
- A barangay official must verify the valid ID before the resident can join events. Until then the account can sign
  in but events stay hidden.
- Profile > Edit details changes name, username, email, mobile number, password and profile photo. Profile can also
  replace the valid ID photo, which then needs verification again.
- Forgot password sends a 6-digit SMS code when SMS codes are switched on; otherwise the barangay office resets it.
Events and attendance
- Officials create events with a title, category, date, time, location on a map, points per attendee (1 to 500) and
  an optional participant limit.
- Residents tap Join on an event in their barangay. Each joined event gives a ticket with a QR code and an
  8-character ticket code (Tickets menu). A resident can cancel before checking in.
- At the event an official scans the ticket QR, types the ticket code, or checks the resident in manually. Points are
  added right after check-in. Each ticket checks in only once.
- When an event is marked as done it no longer accepts joins or check-ins; an official can reopen it.
Points and titles
- Points come from attended events and bonus points that officials give (1 to 500 at a time, with a reason).
- Titles are based on the highest point total ever reached, so redeeming rewards never removes a title.
Rewards
- Rewards menu lists the barangay's reward items with their point cost, stock and limit per claim.
- Reserving a reward HOLDS the points; they are NOT deducted yet. Points are deducted only when an official releases
  the reward. Held points cannot be used for another reservation.
- After reserving, the resident gets a reward QR code and pickup code (Rewards > Recent claims > Show QR to claim).
  At the barangay hall the official scans it or types the code to release the item. Each code works once.
- If an official rejects a claim, the hold is released and the item goes back into stock. No points are taken.
Barangay transfer
- A resident who moved uses Transfer barangay to ask to move; the officials of the new barangay approve or reject it.
- Points do NOT carry over: on approval the Eco-Points balance resets to 0 because points belong to the barangay
  where they were earned. Titles stay. Reserved rewards and unused tickets for upcoming events in the old barangay
  are cancelled. Spend points before transferring.
Other screens
- Leaderboard: top residents of the barangay by points (shows first name and last initial).
- Barangay officials: names and contact numbers of the resident's barangay officials.
- The app can be installed on a phone: browser menu > Install app / Add to Home Screen.
For officials
- Residents: verify or revoke valid IDs, award bonus points, move a resident to another barangay, export to Excel.
- Rewards inventory: add, edit or hide reward items. Reward claims: scan reward QR, release or reject, and search
  claims by resident and date.
- Transfer requests: approve or reject residents moving into the barangay.
- Reports: Activity log, Statistics, Event reports (searchable, with Excel export), Generate statistics (Excel report
  for any date range), and each event's attendance report."""

ECO_GUIDE = """ECO GUIDE (practical, Philippine context)
- Republic Act 9003 (Ecological Solid Waste Management Act of 2000) requires segregation at source into
  biodegradable (nabubulok: food scraps, leaves), recyclable (clean paper, cartons, bottles, cans, rigid plastics),
  residual (sachets, diapers, soiled tissue, styrofoam) and special or hazardous waste (batteries, busted bulbs,
  paint, chemical containers, old electronics). It calls for a Materials Recovery Facility (MRF) serving each barangay
  or cluster of barangays, and it prohibits open burning of waste.
- Recycling: rinse and dry containers, flatten boxes and cartons, keep paper dry, and bring recyclables to the MRF or
  a junk shop. Most multilayer sachets are residual, not recyclable.
- Composting: mix greens (fruit and vegetable scraps, fresh leaves) with browns (dry leaves, shredded paper), keep it
  as damp as a wrung sponge, turn it every week, and avoid meat, bones, oil and dairy. It is usually ready in one to
  three months.
- Reduce plastic: bring eco-bags, a tumbler and food containers, refill instead of buying sachets, and say no to
  single-use straws and cutlery.
- Mangroves protect the coast from storm surge and are nurseries for fish. Never cut or uproot them; plant only in
  organized drives that pick the right species and spot with guidance from environment officials.
- Cleanup safety: wear gloves and closed shoes or rubber boots, use sun protection, bring water, work in groups, watch
  the tide on coastal and river cleanups, never pick up needles, broken glass or medical waste by hand (tell an
  official), and wash your hands afterwards."""

LIMITS = """WHAT YOU CANNOT DO (say so plainly when it applies)
- You only know the EcoConnect data given below and the two guides above. You cannot browse the internet and you do not
  have news, weather, prices, schedules outside EcoConnect, or data of other barangays.
- You cannot take actions: you cannot join events, check anyone in, release or reject rewards, change accounts or
  approve transfers. Tell the user which screen to use or which official to ask.
- You never share other users' private information (phone numbers, emails, IDs, points of named people beyond the
  public leaderboard).
- You give general eco tips, not medical, legal or financial advice."""


def title_ladder():
    return ', '.join(f'{name} ({points} pts)' for points, name in sorted(TITLE_THRESHOLDS))


def next_title(points):
    for threshold, name in sorted(TITLE_THRESHOLDS):
        if points < threshold:
            return name, threshold - points
    return None, 0
