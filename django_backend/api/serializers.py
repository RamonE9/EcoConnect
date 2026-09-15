from rest_framework import serializers
from .models import User, Event, Participation, OTPStore, Redemption, Expense, TransferRequest, Incentive, PointAward

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'phone_number', 'email', 'role', 'points', 'barangay', 'id_image', 'profile_picture', 'is_verified', 'title']

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'title', 'description', 'location', 'date', 'time', 'organizer', 'points_reward', 'barangay', 'status', 'category']

class ParticipationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participation
        fields = ['id', 'user', 'event', 'status', 'verified_at']

class OTPStoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTPStore
        fields = '__all__'

class RedemptionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = Redemption
        fields = ['id', 'user', 'username', 'item_name', 'points_spent', 'timestamp', 'status']

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

class TransferRequestSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = TransferRequest
        fields = ['id', 'user', 'username', 'source_barangay', 'target_barangay', 'reason', 'status', 'created_at']

class IncentiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incentive
        fields = ['id', 'barangay', 'name', 'points_cost', 'stock', 'icon', 'is_active']

class PointAwardSerializer(serializers.ModelSerializer):
    awarded_by_username = serializers.CharField(source='awarded_by.username', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = PointAward
        fields = ['id', 'user', 'username', 'awarded_by', 'awarded_by_username', 'points', 'reason', 'created_at']
