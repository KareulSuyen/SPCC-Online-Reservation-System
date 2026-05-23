from django.db import models
from django.conf import settings

class Category(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Item(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='items')
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  
    stock_quantity = models.IntegerField(default=0, null=True, blank=True) 
    image = models.ImageField(upload_to='items/', blank=True, null=True)
    is_available = models.BooleanField(default=True)
    has_sizes = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - ₱{self.price}" if self.price else self.name


class ItemSize(models.Model):
    SIZE_CHOICES = [
        ('XS', 'Extra Small'),
        ('S', 'Small'),
        ('M', 'Medium'),
        ('L', 'Large'),
        ('XL', 'Extra Large'),
        ('XXL', 'Double Extra Large'),
    ]
    
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='sizes')
    size = models.CharField(max_length=10, choices=SIZE_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    is_available = models.BooleanField(default=True)

    class Meta:
        unique_together = ('item', 'size')
        ordering = ['size']

    def __str__(self):
        return f"{self.item.name} - {self.size}"


class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Cart - {self.user.email}"
    
    @property
    def total_price(self):
        return sum(item.subtotal for item in self.items.all())
    
    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    item_size = models.ForeignKey(ItemSize, on_delete=models.CASCADE, null=True, blank=True)
    quantity = models.IntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.quantity}x {self.display_name}"
    
    @property
    def display_name(self):
        if self.item_size:
            return f"{self.item.name} - {self.item_size.size}"
        return self.item.name
    
    @property
    def subtotal(self):
        if self.item_size:
            return self.item_size.price * self.quantity
        return self.item.price * self.quantity


class Reservation(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('ready', 'Ready for Pickup'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reservations')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Reservation #{self.id} - {self.user.email} - {self.status}"


class ReservationItem(models.Model):
    reservation = models.ForeignKey(Reservation, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    item_size = models.ForeignKey(ItemSize, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.IntegerField()
    price_at_time = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        return f"{self.quantity}x {self.display_name}"
    
    @property
    def display_name(self):
        if self.item_size:
            return f"{self.item.name} - {self.item_size.size}"
        return self.item.name
    
    @property
    def subtotal(self):
        return self.price_at_time * self.quantity

class ChatRoom(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='support_chats'
    )
    subject = models.CharField(max_length=200, blank=True, default='Support Request')
    status = models.CharField(
        max_length=20,
        choices=[
            ('open', 'Open'),
            ('in_progress', 'In Progress'),
            ('resolved', 'Resolved'),
            ('closed', 'Closed'),
        ],
        default='open'
    )
    assigned_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_support_chats'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-last_message_at']
    
    def __str__(self):
        return f"Chat #{self.id} - {self.user.email} - {self.status}"
    
    @property
    def unread_count_for_user(self):
        return self.messages.filter(is_admin=True, is_read=False).count()
    
    @property
    def unread_count_for_admin(self):
        return self.messages.filter(is_admin=False, is_read=False).count()


class ChatMessage(models.Model):
    chat_room = models.ForeignKey(
        ChatRoom, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    message = models.TextField()
    is_admin = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    attachment = models.FileField(
        upload_to='chat_attachments/',
        blank=True,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Message from {self.sender.email} at {self.created_at}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.chat_room.last_message_at = self.created_at
        self.chat_room.save(update_fields=['last_message_at'])