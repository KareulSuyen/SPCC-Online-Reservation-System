from rest_framework import serializers
from .models import (
    Category, Item, ItemSize, Cart, CartItem, 
    Reservation, ReservationItem, ChatRoom, ChatMessage
)

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'created_at']

class ItemSizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemSize
        fields = ['id', 'size', 'price', 'stock_quantity', 'is_available']

class ItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    sizes = ItemSizeSerializer(many=True, read_only=True)
    
    class Meta:
        model = Item
        fields = ['id', 'name', 'category', 'category_name', 
                  'price', 'stock_quantity', 'image', 'is_available', 'has_sizes', 
                  'sizes', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class CartItemSerializer(serializers.ModelSerializer):
    item_details = ItemSerializer(source='item', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_price = serializers.DecimalField(source='item.price', max_digits=10, decimal_places=2, read_only=True)
    size_name = serializers.CharField(source='item_size.size', read_only=True, allow_null=True)
    size_price = serializers.DecimalField(source='item_size.price', max_digits=10, decimal_places=2, read_only=True, allow_null=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    display_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = CartItem
        fields = ['id', 'item', 'item_size', 'item_details', 'item_name', 'item_price',
                  'size_name', 'size_price', 'quantity', 'subtotal', 'display_name', 'added_at']
        read_only_fields = ['added_at']

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Cart
        fields = ['id', 'user', 'items', 'total_price', 'total_items', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']

class ReservationItemSerializer(serializers.ModelSerializer):
    item_details = ItemSerializer(source='item', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    size_name = serializers.CharField(source='item_size.size', read_only=True, allow_null=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    display_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = ReservationItem
        fields = ['id', 'item', 'item_size', 'item_details', 'item_name', 'size_name', 
                  'quantity', 'price_at_time', 'subtotal', 'display_name']

class ReservationSerializer(serializers.ModelSerializer):
    items = ReservationItemSerializer(many=True, read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Reservation
        fields = ['id', 'user', 'user_email', 'user_full_name', 'status', 
                  'total_amount', 'notes', 'items', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']
    
    def get_user_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email

class CreateReservationSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_email = serializers.CharField(source='sender.email', read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'chat_room', 'sender', 'sender_name', 'sender_email',
            'message', 'is_admin', 'is_read', 'attachment', 'created_at'
        ]
        read_only_fields = ['sender', 'is_admin', 'created_at']
    
    def get_sender_name(self, obj):
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.email


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_email = serializers.CharField(source='sender.email', read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'chat_room', 'sender', 'sender_name', 'sender_email',
            'message', 'is_admin', 'is_read', 'attachment', 'created_at'
        ]
        read_only_fields = ['sender', 'is_admin', 'created_at']
    
    def get_sender_name(self, obj):
        return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.email


class ChatRoomSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    assigned_admin_name = serializers.SerializerMethodField()
    unread_count_for_user = serializers.IntegerField(read_only=True)
    unread_count_for_admin = serializers.IntegerField(read_only=True)
    last_message = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatRoom
        fields = [
            'id', 'user', 'user_name', 'user_email', 'subject', 'status', 
            'assigned_admin', 'assigned_admin_name',
            'unread_count_for_user', 'unread_count_for_admin',
            'last_message', 'created_at', 'updated_at', 'last_message_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at', 'last_message_at']
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
    
    def get_assigned_admin_name(self, obj):
        if obj.assigned_admin:
            return f"{obj.assigned_admin.first_name} {obj.assigned_admin.last_name}".strip()
        return None
    
    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return {
                'message': last_msg.message[:100],
                'created_at': last_msg.created_at,
                'is_admin': last_msg.is_admin
            }
        return None


class ChatRoomDetailSerializer(ChatRoomSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    
    class Meta(ChatRoomSerializer.Meta):
        fields = ChatRoomSerializer.Meta.fields + ['messages']


class CreateChatRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatRoom
        fields = ['subject']
        
    def validate_subject(self, value):
        if not value or len(value.strip()) < 3:
            raise serializers.ValidationError(
                "Subject must be at least 3 characters long"
            )
        return value