from django.db import models
from django.contrib.auth.hashers import UNUSABLE_PASSWORD_PREFIX, identify_hasher
from django.contrib.auth.models import AbstractUser


def password_is_hashed(value):
    """True if `value` is a Django password hash (or a deliberately unusable password)."""
    if value.startswith(UNUSABLE_PASSWORD_PREFIX):
        return True
    try:
        identify_hasher(value)
        return True
    except ValueError:
        return False

# Title thresholds — shared across backend
TITLE_THRESHOLDS = [
    (500, "Eco Legend"),
    (300, "Planet Protector"),
    (200, "Monster Sweeper"),
    (150, "Bio Crusader"),
    (100, "Nature's Knight"),
    (60,  "Eco Avenger"),
    (30,  "Green Guardian"),
    (10,  "Sprout Scout"),
]

def compute_title(points):
    """Return the highest earned title for the given points total."""
    for threshold, title in TITLE_THRESHOLDS:
        if points >= threshold:
            return title
    return ""

class User(AbstractUser):
    phone_number = models.CharField(max_length=20, unique=True)
    role = models.CharField(max_length=20, default='resident')
    points = models.IntegerField(default=0)
    barangay = models.CharField(max_length=50, null=True, blank=True)
    id_image = models.CharField(max_length=500, null=True, blank=True)
    profile_picture = models.CharField(max_length=500, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    title = models.CharField(max_length=50, null=True, blank=True)
    # Highest points balance ever reached. Titles are based on this, so
    # spending points on rewards never takes an achievement away.
    peak_points = models.IntegerField(default=0)

    @property
    def achievement_points(self):
        return max(self.peak_points, self.points)

    def refresh_title(self):
        """Raise the peak to the current balance if needed and store the matching title."""
        self.peak_points = self.achievement_points
        self.title = compute_title(self.peak_points)
        self.save(update_fields=['peak_points', 'title'])

    def save(self, *args, **kwargs):
        # Safety net: never store a password as plain text, whatever set it.
        if self.password and not password_is_hashed(self.password):
            self.set_password(self.password)
        # Points edited directly (e.g. Django admin) still count towards the peak.
        if self.points > self.peak_points:
            self.peak_points = self.points
            update_fields = kwargs.get('update_fields')
            if update_fields is not None and 'peak_points' not in update_fields:
                kwargs['update_fields'] = [*update_fields, 'peak_points']
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username

class Event(models.Model):
    CATEGORY_CHOICES = [
        ('General Cleanup', 'General Cleanup'),
        ('Coastal Cleanup', 'Coastal Cleanup'),
        ('Tree Planting', 'Tree Planting'),
        ('River Cleanup', 'River Cleanup'),
        ('Waste Segregation', 'Waste Segregation'),
        ('Mangrove Planting', 'Mangrove Planting'),
        ('Urban Gardening', 'Urban Gardening'),
    ]

    title = models.CharField(max_length=100)
    description = models.TextField()
    location = models.CharField(max_length=200)
    date = models.CharField(max_length=50)
    time = models.CharField(max_length=50)
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_events')
    points_reward = models.IntegerField(default=10)
    barangay = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=20, default='upcoming')  # upcoming | completed (marked done)
    completed_at = models.DateTimeField(null=True, blank=True)
    category = models.CharField(max_length=50, default='General Cleanup', choices=CATEGORY_CHOICES)
    # Optional cap on how many residents can join. Empty = no limit.
    max_participants = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self):
        return self.title

class Participation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='participations')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='participants')
    status = models.CharField(max_length=20, default='joined')
    verified_at = models.CharField(max_length=50, null=True, blank=True)
    # Attendance details (filled when an official marks the resident attended)
    attended_at = models.DateTimeField(null=True, blank=True)
    checkin_method = models.CharField(max_length=10, null=True, blank=True)  # 'qr' or 'manual'
    checked_in_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='checkins_recorded')
    # Unique per registration; shown on the resident's ticket (QR + typed code).
    ticket_code = models.CharField(max_length=8, null=True, blank=True, db_index=True)

    def __str__(self):
        return f"{self.user.username} - {self.event.title} ({self.status})"

class OTPStore(models.Model):
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    email = models.CharField(max_length=120, null=True, blank=True)
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def __str__(self):
        target = self.phone_number if self.phone_number else self.email
        return f"OTP for {target} ({self.otp_code})"

class Redemption(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='redemptions')
    item_name = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(default=1)
    points_spent = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='Pending') # Pending, Claimed

    def __str__(self):
        return f"{self.user.username} - {self.quantity} x {self.item_name} ({self.status})"

class Expense(models.Model):
    barangay = models.CharField(max_length=50)
    amount = models.FloatField()
    description = models.CharField(max_length=200)
    category = models.CharField(max_length=50, default='Spent') # Budget, Spent
    date = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.barangay} - {self.description} ({self.amount})"

class TransferRequest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transfer_requests')
    source_barangay = models.CharField(max_length=50)
    target_barangay = models.CharField(max_length=50)
    reason = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, default='Pending') # Pending, Approved, Rejected
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Transfer for {self.user.username} to {self.target_barangay} ({self.status})"

class Incentive(models.Model):
    """Barangay-managed redeemable incentive with live stock tracking."""
    barangay = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    points_cost = models.IntegerField(default=50)
    stock = models.IntegerField(default=0)
    max_per_claim = models.PositiveIntegerField(default=1)  # most a resident can take in one claim
    icon = models.CharField(max_length=10, default='🎁')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.barangay}) - Stock: {self.stock}"

class PointAward(models.Model):
    """Audit log for direct point awards by officials/admins."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='point_awards')
    awarded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='awards_given')
    points = models.IntegerField()
    reason = models.CharField(max_length=255, blank=True, default='Direct award by official')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.points} pts → {self.user.username} by {self.awarded_by}"
