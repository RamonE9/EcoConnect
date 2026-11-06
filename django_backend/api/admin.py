from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DefaultUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import Event, Incentive, OTPStore, Participation, PointAward, Redemption, TransferRequest, User
from .validators import ValidationError, normalize_ph_phone

ROLE_CHOICES = [('admin', 'Barangay official'), ('resident', 'Resident')]


class EcoUserCreationForm(UserCreationForm):
    role = forms.ChoiceField(choices=ROLE_CHOICES, initial='admin')

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ('username', 'first_name', 'last_name', 'email', 'phone_number', 'role', 'barangay')

    def clean_phone_number(self):
        try:
            phone = normalize_ph_phone(self.cleaned_data.get('phone_number'))
        except ValidationError as exc:
            raise forms.ValidationError(str(exc))
        if User.objects.filter(phone_number=phone).exists():
            raise forms.ValidationError('This phone number is already registered.')
        return phone

    def save(self, commit=True):
        user = super().save(commit=False)
        user.role = self.cleaned_data['role']
        user.is_verified = user.role == 'admin'
        if commit:
            user.save()
        return user


class EcoUserChangeForm(UserChangeForm):
    role = forms.ChoiceField(choices=ROLE_CHOICES)

    class Meta(UserChangeForm.Meta):
        model = User
        fields = '__all__'


class UserAdmin(DefaultUserAdmin):
    add_form = EcoUserCreationForm
    form = EcoUserChangeForm
    list_display = ('username', 'first_name', 'last_name', 'role', 'barangay', 'email', 'phone_number', 'points', 'is_verified')
    search_fields = ('username', 'first_name', 'last_name', 'email', 'phone_number')
    list_filter = ('role', 'is_verified', 'barangay')

    add_fieldsets = (
        ('New account', {
            'classes': ('wide',),
            'description': 'Create barangay official accounts here. Residents sign up in the app.',
            'fields': ('username', 'first_name', 'last_name', 'email', 'phone_number', 'role', 'barangay', 'password1', 'password2'),
        }),
    )
    fieldsets = DefaultUserAdmin.fieldsets + (
        ('EcoConnect', {'fields': ('phone_number', 'role', 'barangay', 'points', 'is_verified', 'id_image')}),
    )
    readonly_fields = ('id_image',)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'date', 'barangay', 'organizer', 'points_reward', 'status')
    search_fields = ('title', 'location', 'organizer__username')
    list_filter = ('status', 'barangay')


@admin.register(Participation)
class ParticipationAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'status', 'verified_at')
    search_fields = ('user__username', 'event__title')
    list_filter = ('status',)


@admin.register(Incentive)
class IncentiveAdmin(admin.ModelAdmin):
    list_display = ('name', 'barangay', 'points_cost', 'stock', 'max_per_claim', 'is_active')
    list_filter = ('barangay', 'is_active')


@admin.register(Redemption)
class RedemptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'item_name', 'quantity', 'points_spent', 'status', 'timestamp')
    list_filter = ('status',)


@admin.register(TransferRequest)
class TransferRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'source_barangay', 'target_barangay', 'status', 'created_at')
    list_filter = ('status',)


@admin.register(PointAward)
class PointAwardAdmin(admin.ModelAdmin):
    list_display = ('user', 'points', 'awarded_by', 'reason', 'created_at')


@admin.register(OTPStore)
class OTPStoreAdmin(admin.ModelAdmin):
    list_display = ('email', 'phone_number', 'is_used', 'created_at')
    search_fields = ('phone_number', 'email')
    list_filter = ('is_used', 'created_at')
    exclude = ('otp_code',)


admin.site.register(User, UserAdmin)
admin.site.site_header = 'EcoConnect administration'
admin.site.site_title = 'EcoConnect admin'
