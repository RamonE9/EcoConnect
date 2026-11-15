from django.contrib.auth.hashers import UNUSABLE_PASSWORD_PREFIX, identify_hasher
from django.contrib.auth.models import AbstractUser
from django.db import models


def password_is_hashed(value):
    if value.startswith(UNUSABLE_PASSWORD_PREFIX):
        return True
    try:
        identify_hasher(value)
        return True
    except ValueError:
        return False


TITLE_THRESHOLDS = [
    (500, "Halaman Master"),
    (300, "Lodi ng Lupa"),
    (200, "Plantitosaurus"),
    (150, "Super Tropikal"),
    (100, "Beterano sa Damo"),
    (60,  "Dahon Ranger"),
    (30,  "Pormang Tanim"),
    (10,  "Budol ng Kalikasan"),
]


def compute_title(points):
    for threshold, title in TITLE_THRESHOLDS:
        if points >= threshold:
            return title
    return ""


class Barangay(models.Model):
    name = models.CharField(max_length=50, unique=True)
    city = models.CharField(max_length=60, default='Puerto Princesa City')
    is_participating = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'barangays'
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):
    ROLE_CHOICES = [('resident', 'Resident'), ('admin', 'Barangay official')]

    phone_number = models.CharField(max_length=20, unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='resident')
    barangay = models.ForeignKey(Barangay, on_delete=models.PROTECT, null=True, blank=True, related_name='users')
    points = models.IntegerField(default=0)
    peak_points = models.IntegerField(default=0)
    title = models.CharField(max_length=50, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    id_image = models.CharField(max_length=500, null=True, blank=True)
    profile_picture = models.CharField(max_length=500, null=True, blank=True)

    class Meta:
        db_table = 'users'

    @property
    def full_name(self):
        return ' '.join(part for part in (self.first_name, self.last_name) if part).strip() or self.username

    @property
    def short_name(self):
        if not self.first_name:
            return self.username
        return f"{self.first_name} {self.last_name[:1]}.".strip() if self.last_name else self.first_name

    @property
    def achievement_points(self):
        return max(self.peak_points, self.points)

    def refresh_title(self):
        self.peak_points = self.achievement_points
        self.title = compute_title(self.peak_points)
        self.save(update_fields=['peak_points', 'title'])

    def save(self, *args, **kwargs):
        if self.password and not password_is_hashed(self.password):
            self.set_password(self.password)
        if self.points > self.peak_points:
            self.peak_points = self.points
            update_fields = kwargs.get('update_fields')
            if update_fields is not None and 'peak_points' not in update_fields:
                kwargs['update_fields'] = [*update_fields, 'peak_points']
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username


class EventCategory(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'event_categories'
        ordering = ['name']
        verbose_name_plural = 'event categories'

    def __str__(self):
        return self.name


class Event(models.Model):
    STATUS_CHOICES = [('upcoming', 'Upcoming'), ('completed', 'Completed'), ('cancelled', 'Cancelled')]

    barangay = models.ForeignKey(Barangay, on_delete=models.PROTECT, related_name='events')
    organizer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='organized_events')
    category = models.ForeignKey(EventCategory, on_delete=models.PROTECT, related_name='events')
    title = models.CharField(max_length=100)
    description = models.TextField()
    location = models.CharField(max_length=200)
    date = models.DateField()
    time = models.TimeField()
    points_reward = models.PositiveIntegerField(default=10)
    max_participants = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'events'
        ordering = ['date', 'time']

    def __str__(self):
        return self.title


class Participation(models.Model):
    STATUS_CHOICES = [('joined', 'Joined'), ('attended', 'Attended')]
    METHOD_CHOICES = [('qr', 'QR scan'), ('code', 'Typed code'), ('manual', 'Manual')]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='participations')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='participants')
    checked_in_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='checkins_recorded')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='joined')
    ticket_code = models.CharField(max_length=8, unique=True, null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    attended_at = models.DateTimeField(null=True, blank=True)
    checkin_method = models.CharField(max_length=10, choices=METHOD_CHOICES, null=True, blank=True)

    class Meta:
        db_table = 'event_participants'
        constraints = [models.UniqueConstraint(fields=['user', 'event'], name='one_ticket_per_resident_per_event')]

    def __str__(self):
        return f"{self.user.username} - {self.event.title} ({self.status})"


class Incentive(models.Model):
    barangay = models.ForeignKey(Barangay, on_delete=models.PROTECT, related_name='rewards')
    name = models.CharField(max_length=100)
    points_cost = models.PositiveIntegerField(default=50)
    stock = models.PositiveIntegerField(default=0)
    max_per_claim = models.PositiveIntegerField(default=1)
    icon = models.CharField(max_length=10, default='🎁')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rewards'

    def __str__(self):
        return f"{self.name} ({self.barangay}) - Stock: {self.stock}"


class Redemption(models.Model):
    STATUS_CHOICES = [('Pending', 'Reserved'), ('Claimed', 'Received'), ('Rejected', 'Rejected')]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='redemptions')
    reward = models.ForeignKey(Incentive, on_delete=models.SET_NULL, null=True, blank=True, related_name='claims')
    claimed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='claims_released')
    item_name = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(default=1)
    points_spent = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    claim_code = models.CharField(max_length=8, unique=True, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    claimed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'reward_claims'

    def __str__(self):
        return f"{self.user.username} - {self.quantity} x {self.item_name} ({self.status})"


class PointAward(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='point_awards')
    awarded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='awards_given')
    points = models.PositiveIntegerField()
    reason = models.CharField(max_length=255, blank=True, default='Direct award by official')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'point_awards'

    def __str__(self):
        return f"{self.points} pts → {self.user.username} by {self.awarded_by}"


class TransferRequest(models.Model):
    STATUS_CHOICES = [('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected')]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transfer_requests')
    source_barangay = models.ForeignKey(Barangay, on_delete=models.PROTECT, related_name='transfers_out')
    target_barangay = models.ForeignKey(Barangay, on_delete=models.PROTECT, related_name='transfers_in')
    decided_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='transfers_decided')
    reason = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'transfer_requests'

    def __str__(self):
        return f"Transfer for {self.user.username} to {self.target_barangay} ({self.status})"


class OTPStore(models.Model):
    PURPOSE_CHOICES = [('signup', 'Sign-up'), ('reset', 'Password reset')]

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='otp_codes')
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    email = models.CharField(max_length=120, null=True, blank=True)
    otp_code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=10, choices=PURPOSE_CHOICES, default='reset')
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'otp_codes'

    def __str__(self):
        target = self.phone_number if self.phone_number else self.email
        return f"OTP for {target} ({self.otp_code})"
