from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.db import transaction
import logging

from .models import Category, Item, ItemSize, Cart, CartItem, Reservation, ReservationItem
from .serializers import (
    CategorySerializer, ItemSerializer, ItemSizeSerializer, CartSerializer, 
    CartItemSerializer, ReservationSerializer, CreateReservationSerializer
)
from .models import ChatRoom, ChatMessage
from .serializers import (
    ChatRoomSerializer, ChatRoomDetailSerializer, 
    ChatMessageSerializer, CreateChatRoomSerializer
)

from accounts.email_utils import send_reservation_confirmation_email

logger = logging.getLogger(__name__)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]  


class ItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Item.objects.filter(is_available=True)
    serializer_class = ItemSerializer
    permission_classes = [AllowAny]  
    
    def get_queryset(self):
        queryset = Item.objects.filter(is_available=True)
        
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category_id=category)
        
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                name__icontains=search
            ) | queryset.filter(
                category__name__icontains=search
            )
        
        return queryset


class CartViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        cart, created = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def add_item(self, request):
        item_id = request.data.get('item_id')
        item_size_id = request.data.get('item_size_id')
        quantity = request.data.get('quantity', 1)
        
        try:
            item = Item.objects.get(id=item_id, is_available=True)
        except Item.DoesNotExist:
            return Response(
                {'error': 'Item not found or unavailable'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        item_size = None
        if item.has_sizes:
            if not item_size_id:
                return Response(
                    {'error': 'Please select a size'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            try:
                item_size = ItemSize.objects.get(id=item_size_id, item=item, is_available=True)
            except ItemSize.DoesNotExist:
                return Response(
                    {'error': 'Size not found or unavailable'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            if quantity > item_size.stock_quantity:
                return Response(
                    {'error': f'Only {item_size.stock_quantity} items available in this size'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            if quantity > item.stock_quantity:
                return Response(
                    {'error': f'Only {item.stock_quantity} items available'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        cart, created = Cart.objects.get_or_create(user=request.user)
        
        if item_size:
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart, 
                item=item, 
                item_size=item_size
            )
        else:
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart, 
                item=item, 
                item_size=None
            )
        
        if not created:
            cart_item.quantity += quantity
            max_stock = item_size.stock_quantity if item_size else item.stock_quantity
            if cart_item.quantity > max_stock:
                return Response(
                    {'error': f'Cannot add more. Only {max_stock} items available'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            cart_item.quantity = quantity
        
        cart_item.save()
        
        serializer = CartSerializer(cart)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['patch'])
    def update_item(self, request):
        cart_item_id = request.data.get('cart_item_id')
        quantity = request.data.get('quantity')
        
        try:
            cart_item = CartItem.objects.get(
                id=cart_item_id, 
                cart__user=request.user
            )
        except CartItem.DoesNotExist:
            return Response(
                {'error': 'Cart item not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        if quantity <= 0:
            cart_item.delete()
            cart = Cart.objects.get(user=request.user)
            serializer = CartSerializer(cart)
            return Response(serializer.data)
        
        max_stock = cart_item.item_size.stock_quantity if cart_item.item_size else cart_item.item.stock_quantity
        if quantity > max_stock:
            return Response(
                {'error': f'Only {max_stock} items available'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cart_item.quantity = quantity
        cart_item.save()
        
        cart = Cart.objects.get(user=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)
    
    @action(detail=False, methods=['delete'])
    def remove_item(self, request):
        cart_item_id = request.data.get('cart_item_id')
        
        try:
            cart_item = CartItem.objects.get(
                id=cart_item_id, 
                cart__user=request.user
            )
            cart_item.delete()
        except CartItem.DoesNotExist:
            return Response(
                {'error': 'Cart item not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        cart = Cart.objects.get(user=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)
    
    @action(detail=False, methods=['delete'])
    def clear(self, request):
        cart, created = Cart.objects.get_or_create(user=request.user)
        cart.items.all().delete()
        
        serializer = CartSerializer(cart)
        return Response(serializer.data)


class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return Reservation.objects.all()
        return Reservation.objects.filter(user=self.request.user)
    
    @transaction.atomic
    def create(self, request):
        serializer = CreateReservationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response(
                {'error': 'Cart is empty'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not cart.items.exists():
            return Response(
                {'error': 'Cart is empty'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        for cart_item in cart.items.all():
            if cart_item.item_size:
                if cart_item.quantity > cart_item.item_size.stock_quantity:
                    return Response(
                        {'error': f'Insufficient stock for {cart_item.display_name}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                if cart_item.quantity > cart_item.item.stock_quantity:
                    return Response(
                        {'error': f'Insufficient stock for {cart_item.item.name}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        reservation = Reservation.objects.create(
            user=request.user,
            total_amount=cart.total_price,
            notes=serializer.validated_data.get('notes', '')
        )
        
        logger.info(f"Created reservation #{reservation.id} for user {request.user.email}")
        
        for cart_item in cart.items.all():
            price = cart_item.item_size.price if cart_item.item_size else cart_item.item.price
            
            ReservationItem.objects.create(
                reservation=reservation,
                item=cart_item.item,
                item_size=cart_item.item_size,
                quantity=cart_item.quantity,
                price_at_time=price
            )

        reservation_id = reservation.id

        def send_email():
            try:
                r = Reservation.objects.prefetch_related(
                    'items__item',
                    'items__item_size'
                ).get(id=reservation_id)
                success, message = send_reservation_confirmation_email(r)
                if success:
                    logger.info(f"Confirmation email sent successfully for reservation #{reservation_id}")
                else:
                    logger.error(f"Failed to send confirmation email for reservation #{reservation_id}: {message}")
            except Reservation.DoesNotExist:
                logger.error(f"Reservation #{reservation_id} not found when trying to send confirmation email")
            except Exception as e:
                logger.error(f"Exception while sending confirmation email for reservation #{reservation_id}: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())

        transaction.on_commit(send_email)
        
        result_serializer = ReservationSerializer(reservation)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
    def update_status(self, request, pk=None):
        reservation = self.get_object()
        new_status = request.data.get('status')
        
        valid_statuses = ['pending', 'confirmed', 'ready', 'completed', 'cancelled']
        if new_status not in valid_statuses:
            return Response(
                {'error': 'Invalid status'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = reservation.status

        if new_status == 'completed' and old_status != 'completed':
            for reservation_item in reservation.items.all():
                if reservation_item.item_size:
                    reservation_item.item_size.stock_quantity -= reservation_item.quantity
                    reservation_item.item_size.save()
                else:
                    reservation_item.item.stock_quantity -= reservation_item.quantity
                    reservation_item.item.save()

            try:
                cart = Cart.objects.get(user=reservation.user)
                cart.items.all().delete()
            except Cart.DoesNotExist:
                pass

        if old_status == 'completed' and new_status != 'completed':
            for reservation_item in reservation.items.all():
                if reservation_item.item_size:
                    reservation_item.item_size.stock_quantity += reservation_item.quantity
                    reservation_item.item_size.save()
                else:
                    reservation_item.item.stock_quantity += reservation_item.quantity
                    reservation_item.item.save()

        reservation.status = new_status
        reservation.save()
        
        serializer = ReservationSerializer(reservation)
        return Response(serializer.data)


class ChatRoomViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ChatRoomDetailSerializer
        elif self.action == 'create':
            return CreateChatRoomSerializer
        return ChatRoomSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            queryset = ChatRoom.objects.all()
        else:
            queryset = ChatRoom.objects.filter(user=user)
        
        return queryset.select_related('user', 'assigned_admin').prefetch_related('messages')
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        existing_open_chat = ChatRoom.objects.filter(
            user=request.user,
            status__in=['open', 'in_progress']
        ).first()
        
        if existing_open_chat:
            return Response({
                'error': 'You already have an open support request',
                'chat_room_id': existing_open_chat.id
            }, status=status.HTTP_400_BAD_REQUEST)
        
        chat_room = serializer.save(user=request.user)
        
        ChatMessage.objects.create(
            chat_room=chat_room,
            sender=request.user,
            message=f"Support request created: {chat_room.subject}",
            is_admin=False
        )
        
        result_serializer = ChatRoomDetailSerializer(chat_room)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        chat_room = self.get_object()
        
        if not request.user.is_staff and chat_room.user != request.user:
            return Response(
                {'error': 'You do not have permission to send messages in this chat'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        message_text = request.data.get('message', '').strip()
        if not message_text:
            return Response(
                {'error': 'Message cannot be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        message = ChatMessage.objects.create(
            chat_room=chat_room,
            sender=request.user,
            message=message_text,
            is_admin=request.user.is_staff
        )
        
        if chat_room.status == 'open' and request.user.is_staff:
            chat_room.status = 'in_progress'
            if not chat_room.assigned_admin:
                chat_room.assigned_admin = request.user
            chat_room.save()
        
        serializer = ChatMessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        chat_room = self.get_object()
        
        if request.user.is_staff:
            chat_room.messages.filter(is_admin=False, is_read=False).update(is_read=True)
        else:
            chat_room.messages.filter(is_admin=True, is_read=False).update(is_read=True)
        
        return Response({'success': True})
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
    def update_status(self, request, pk=None):
        chat_room = self.get_object()
        new_status = request.data.get('status')
        
        valid_statuses = ['open', 'in_progress', 'resolved', 'closed']
        if new_status not in valid_statuses:
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        chat_room.status = new_status
        
        if new_status == 'in_progress' and not chat_room.assigned_admin:
            chat_room.assigned_admin = request.user
        
        chat_room.save()
        
        ChatMessage.objects.create(
            chat_room=chat_room,
            sender=request.user,
            message=f"Status changed to: {new_status}",
            is_admin=True
        )
        
        serializer = ChatRoomDetailSerializer(chat_room)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
    def assign_admin(self, request, pk=None):
        chat_room = self.get_object()
        admin_id = request.data.get('admin_id')
        
        if not admin_id:
            chat_room.assigned_admin = request.user
        else:
            try:
                from accounts.models import User
                admin = User.objects.get(id=admin_id, is_staff=True)
                chat_room.assigned_admin = admin
            except User.DoesNotExist:
                return Response(
                    {'error': 'Admin not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        chat_room.save()
        serializer = ChatRoomSerializer(chat_room)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_chats(self, request):
        chats = ChatRoom.objects.filter(user=request.user).select_related(
            'user', 'assigned_admin'
        ).prefetch_related('messages')
        
        serializer = ChatRoomSerializer(chats, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def admin_dashboard(self, request):
        stats = {
            'total_chats': ChatRoom.objects.count(),
            'open_chats': ChatRoom.objects.filter(status='open').count(),
            'in_progress_chats': ChatRoom.objects.filter(status='in_progress').count(),
            'my_assigned_chats': ChatRoom.objects.filter(assigned_admin=request.user).count(),
            'unassigned_chats': ChatRoom.objects.filter(assigned_admin=None, status='open').count(),
        }
        return Response(stats)