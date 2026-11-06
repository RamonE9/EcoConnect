from rest_framework import serializers
from .models import compute_title, User, Event, Participation, OTPStore, Redemption, Expense, TransferRequest, Incentive, PointAward

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'phone_number', 'email', 'role', 'points', 'barangay', 'has_id_image', 'profile_picture', 'is_verified', 'title', 'peak_points']

    full_name = serializers.CharField(read_only=True)

    title = serializers.SerializerMethodField()
    has_id_image = serializers.SerializerMethodField()

    def get_has_id_image(self, obj):
        return bool(obj.id_image)

    def get_title(self, obj):
        return compute_title(obj.achievement_points)


class PublicUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'points', 'barangay', 'profile_picture', 'title']

    full_name = serializers.CharField(source='short_name', read_only=True)

    title = serializers.SerializerMethodField()

    def get_title(self, obj):
        return compute_title(obj.achievement_points)


class OfficialContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'phone_number', 'email', 'role', 'barangay', 'profile_picture']

    full_name = serializers.CharField(read_only=True)

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'location', 'date', 'time', 'organizer', 'points_reward', 'barangay',
                  'status', 'completed_at', 'category', 'max_participants', 'participants_count']

    participants_count = serializers.SerializerMethodField()

    def get_participants_count(self, obj):
        count = getattr(obj, 'num_participants', None)
        return count if count is not None else obj.participants.count()

class ParticipationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participation
        fields = ['id', 'user', 'event', 'status', 'verified_at', 'attended_at', 'checkin_method']

class OTPStoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTPStore
        fields = '__all__'

class RedemptionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    class Meta:
        model = Redemption
        fields = ['id', 'user', 'username', 'full_name', 'item_name', 'quantity', 'points_spent', 'timestamp', 'status',
                  'claim_code', 'claimed_at', 'claimed_by_name']

    claim_code = serializers.SerializerMethodField()
    claimed_by_name = serializers.CharField(source='claimed_by.full_name', read_only=True, default=None)

    def get_claim_code(self, obj):
        return f"{obj.claim_code[:4]}-{obj.claim_code[4:]}" if obj.claim_code else None

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

class TransferRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    class Meta:
        model = TransferRequest
        fields = ['id', 'user', 'username', 'full_name', 'source_barangay', 'target_barangay', 'reason', 'status', 'created_at']

class IncentiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incentive
        fields = ['id', 'barangay', 'name', 'points_cost', 'stock', 'max_per_claim', 'icon', 'is_active']

class PointAwardSerializer(serializers.ModelSerializer):
    awarded_by_username = serializers.CharField(source='awarded_by.username', read_only=True)
    awarded_by_name = serializers.CharField(source='awarded_by.full_name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = PointAward
        fields = ['id', 'user', 'username', 'awarded_by', 'awarded_by_username', 'awarded_by_name', 'points', 'reason', 'created_at']
