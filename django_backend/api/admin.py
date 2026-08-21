from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DefaultUserAdmin
from .models import User, Event, Participation, OTPStore

class UserAdmin(DefaultUserAdmin):
    list_display = ('username', 'email', 'phone_number', 'role', 'points', 'barangay', 'is_verified')
    search_fields = ('username', 'email', 'phone_number')
    list_filter = ('role', 'is_verified', 'barangay')
    
    fieldsets = DefaultUserAdmin.fieldsets + (
        ('EcoConnect Info', {'fields': ('phone_number', 'role', 'points', 'barangay', 'id_image', 'is_verified')}),
    )

class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'date', 'location', 'organizer', 'points_reward', 'status', 'barangay')
    search_fields = ('title', 'location', 'organizer__username')
    list_filter = ('status', 'barangay')

class ParticipationAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'status', 'verified_at')
    search_fields = ('user__username', 'event__title')
    list_filter = ('status',)

class OTPStoreAdmin(admin.ModelAdmin):
    list_display = ('phone_number', 'email', 'otp_code', 'is_used', 'created_at')
    search_fields = ('phone_number', 'email')
    list_filter = ('is_used', 'created_at')

admin.site.register(User, UserAdmin)
admin.site.register(Event, EventAdmin)
admin.site.register(Participation, ParticipationAdmin)
admin.site.register(OTPStore, OTPStoreAdmin)
