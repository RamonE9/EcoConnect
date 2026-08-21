from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    phone_number = models.CharField(max_length=20, unique=True)
    role = models.CharField(max_length=20, default='resident')
    points = models.IntegerField(default=0)
    barangay = models.CharField(max_length=50, null=True, blank=True)
    id_image = models.CharField(max_length=255, null=True, blank=True)
    profile_picture = models.CharField(max_length=255, null=True, blank=True)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.username

class Event(models.Model):
    title = models.CharField(max_length=100)
    description = models.TextField()
    location = models.CharField(max_length=200)
    date = models.CharField(max_length=50)
    time = models.CharField(max_length=50)
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_events')
    points_reward = models.IntegerField(default=10)
    barangay = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=20, default='upcoming')

    def __str__(self):
        return self.title

class Participation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='participations')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='participants')
    status = models.CharField(max_length=20, default='joined')
    verified_at = models.CharField(max_length=50, null=True, blank=True)

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
    points_spent = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='Pending') # Pending, Claimed

    def __str__(self):
        return f"{self.user.username} - {self.item_name} ({self.status})"

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
