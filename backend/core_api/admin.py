from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django.contrib.sites.models import Site
from django.utils import timezone
from django.utils.html import format_html
from django.urls import path
from django.shortcuts import redirect
from django.contrib import messages
from allauth.socialaccount.models import SocialApp, SocialAccount, SocialToken
from allauth.account.models import EmailAddress
from rest_framework.authtoken.models import Token, TokenProxy

from accounts.models import User
from .models import Category, Item, ItemSize, Cart, CartItem, Reservation, ReservationItem, ChatRoom, ChatMessage

admin.site.unregister(Group)
admin.site.unregister(Site)
admin.site.unregister(SocialApp)
admin.site.unregister(SocialAccount)
admin.site.unregister(SocialToken)
admin.site.unregister(EmailAddress)
try:
    admin.site.unregister(Token)
except:
    pass
try:
    admin.site.unregister(TokenProxy)
except:
    pass


class NoRecentActionsAdminSite(admin.AdminSite):
    
    def each_context(self, request):
        context = super().each_context(request)
        context['has_permission'] = context.get('has_permission', True)
        return context
    
    def index(self, request, extra_context=None):
        extra_context = extra_context or {}
        return super().index(request, extra_context)

admin_site = NoRecentActionsAdminSite(name='admin')
admin.site = admin_site
admin.sites.site = admin_site

@admin.register(Category, site=admin_site)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'get_item_count', 'created_at', 'get_delete_button']
    search_fields = ['name']
    readonly_fields = ['get_delete_button']
    actions = ['delete_selected_categories']
    
    def get_item_count(self, obj):
        count = obj.items.count()
        if count > 0:
            return format_html('<span style="color: orange; font-weight: bold;">{} items</span>', count)
        return format_html('<span style="color: green;">No items</span>')
    get_item_count.short_description = 'Items in Category'
    
    def get_delete_button(self, obj):
        if obj.pk:
            item_count = obj.items.count()
            warning = f" (Will delete {item_count} items)" if item_count > 0 else ""
            return format_html(
                '<a class="button" href="{}" onclick="return confirm(\'Are you sure you want to delete this category?{}\');" '
                'style="background-color: #dc3545; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">'
                'Delete Category</a>',
                f'/admin/core_api/category/{obj.pk}/delete/',
                warning
            )
        return ''
    get_delete_button.short_description = 'Actions'
    
    def delete_selected_categories(self, request, queryset):
        total_items = sum(cat.items.count() for cat in queryset)
        count = queryset.count()
        queryset.delete()
        self.message_user(request, f'{count} categor{"y" if count == 1 else "ies"} deleted (including {total_items} items).')
    delete_selected_categories.short_description = "Delete selected categories"


class ItemSizeInline(admin.TabularInline):
    model = ItemSize
    extra = 0
    fields = ['size', 'price', 'stock_quantity', 'is_available', 'get_delete_button']
    readonly_fields = ['get_delete_button']
    
    def get_delete_button(self, obj):
        if obj.pk:
            return format_html(
                '<a class="button" href="{}" onclick="return confirm(\'Delete this size?\');" '
                'style="background-color: #dc3545; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-size: 12px;">🗑️ Delete</a>',
                f'/admin/core_api/itemsize/{obj.pk}/delete/'
            )
        return ''
    get_delete_button.short_description = 'Action'
    
    def get_extra(self, request, obj=None, **kwargs):
        if obj and obj.has_sizes:
            return 1
        return 0


class ReservationItemInline(admin.TabularInline):
    model = ReservationItem
    extra = 0
    readonly_fields = ['item', 'item_size', 'quantity', 'price_at_time', 'subtotal', 'display_name']
    fields = ['display_name', 'quantity', 'price_at_time', 'subtotal']
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Item, site=admin_site)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'has_sizes', 'price', 'stock_quantity', 'created_at']
    list_filter = ['category', 'has_sizes', 'created_at']
    search_fields = ['name'] 
    list_editable = ['price', 'stock_quantity', 'has_sizes']
    inlines = [ItemSizeInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'category', 'image')
        }),
        ('Pricing & Stock (for items without sizes)', {
            'fields': ('has_sizes', 'price', 'stock_quantity'),
            'description': 'If "Has sizes" is checked, you can leave price and stock empty. Configure sizes in "Item with sizes" section below.'
        }),
    )
    
    def get_inline_instances(self, request, obj=None):
        if obj is None or obj.has_sizes:
            return super().get_inline_instances(request, obj)
        return []
    
    def save_model(self, request, obj, form, change):
        obj.is_available = True
        super().save_model(request, obj, form, change)
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields['price'].required = False
        form.base_fields['stock_quantity'].required = False
        return form


@admin.register(ItemSize, site=admin_site)
class ItemSizeAdmin(admin.ModelAdmin):
    list_display = ['item', 'size', 'price', 'stock_quantity', 'is_available']
    list_filter = ['size', 'is_available', 'item__category']
    search_fields = ['item__name']
    list_editable = ['price', 'stock_quantity', 'is_available']


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ['item', 'item_size', 'quantity', 'subtotal', 'display_name']
    fields = ['display_name', 'quantity', 'subtotal']
    
    def subtotal(self, obj):
        return f"₱{obj.subtotal:.2f}"
    subtotal.short_description = 'Subtotal'


@admin.register(Cart, site=admin_site)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'get_total_items', 'get_total_price', 'created_at']
    inlines = [CartItemInline]
    readonly_fields = ['user', 'get_total_price', 'get_total_items', 'created_at', 'updated_at']
    
    def get_total_items(self, obj):
        return obj.total_items
    get_total_items.short_description = 'Total Items'
    
    def get_total_price(self, obj):
        return f"₱{obj.total_price:.2f}"
    get_total_price.short_description = 'Total Price'
    
    def has_add_permission(self, request):
        return False


@admin.register(Reservation, site=admin_site)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'get_items_summary', 'status', 'total_amount', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'items__item__name']
    list_editable = ['status']
    inlines = [ReservationItemInline]
    readonly_fields = ['user', 'total_amount', 'created_at', 'updated_at', 'get_items_list']
    
    fieldsets = (
        ('Order Information', {
            'fields': ('user', 'status', 'total_amount', 'notes')
        }),
        ('Order Items', {
            'fields': ('get_items_list',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if change:
            old = Reservation.objects.get(pk=obj.pk)
            old_status = old.status
            new_status = obj.status

            if new_status == 'completed' and old_status != 'completed':
                for reservation_item in obj.items.all():
                    if reservation_item.item_size:
                        reservation_item.item_size.stock_quantity -= reservation_item.quantity
                        reservation_item.item_size.save()
                    else:
                        reservation_item.item.stock_quantity -= reservation_item.quantity
                        reservation_item.item.save()

                try:
                    cart = Cart.objects.get(user=obj.user)
                    cart.items.all().delete()
                except Cart.DoesNotExist:
                    pass

            elif old_status == 'completed' and new_status != 'completed':
                for reservation_item in obj.items.all():
                    if reservation_item.item_size:
                        reservation_item.item_size.stock_quantity += reservation_item.quantity
                        reservation_item.item_size.save()
                    else:
                        reservation_item.item.stock_quantity += reservation_item.quantity
                        reservation_item.item.save()

        super().save_model(request, obj, form, change)
    
    def get_items_summary(self, obj):
        items = obj.items.all()[:3]
        summary = ", ".join([f"{item.quantity}x {item.display_name}" for item in items])
        total = obj.items.count()
        if total > 3:
            summary += f" (+{total - 3} more)"
        return summary
    get_items_summary.short_description = 'Items'
    
    def get_items_list(self, obj):
        items = obj.items.all()
        html = '<table style="width:100%; border-collapse: collapse;">'
        html += '<tr style="background-color: #f2f2f2;"><th style="padding:8px; text-align:left;">Item</th><th style="padding:8px; text-align:center;">Quantity</th><th style="padding:8px; text-align:right;">Price</th><th style="padding:8px; text-align:right;">Subtotal</th></tr>'
        
        for item in items:
            html += f'<tr style="border-bottom: 1px solid #ddd;">'
            html += f'<td style="padding:8px;">{item.display_name}</td>'
            html += f'<td style="padding:8px; text-align:center;">{item.quantity}</td>'
            html += f'<td style="padding:8px; text-align:right;">₱{item.price_at_time:.2f}</td>'
            html += f'<td style="padding:8px; text-align:right;">₱{item.subtotal:.2f}</td>'
            html += '</tr>'
        
        html += f'<tr style="background-color: #f9f9f9; font-weight: bold;">'
        html += f'<td colspan="3" style="padding:8px; text-align:right;">Total:</td>'
        html += f'<td style="padding:8px; text-align:right;">₱{obj.total_amount:.2f}</td>'
        html += '</tr>'
        html += '</table>'
        
        return format_html(html)
    get_items_list.short_description = 'Order Details'


@admin.register(User, site=admin_site)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'is_active', 'ban_status', 
                    'is_email_verified', 'get_last_online', 'is_staff', 'date_joined']
    list_filter = ['is_active', 'is_staff', 'is_superuser', 'is_email_verified', 'date_joined']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-date_joined']
    
    fieldsets = (
        ('Account Information', {
            'fields': ('email', 'password', 'first_name', 'last_name')
        }),
        ('Verification', {
            'fields': ('is_email_verified', 'email_verification_token')
        }),
        ('Ban Management', {
            'fields': ('is_active', 'ban_until', 'ban_reason', 'is_permanently_banned', 'get_ban_actions'),
            'classes': ('wide',)
        }),
        ('Permissions', {
            'fields': ('is_staff', 'is_superuser', 'user_permissions'),
            'classes': ('collapse',)
        }),
        ('Important Dates', {
            'fields': ('date_joined', 'last_login', 'last_online'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ['date_joined', 'last_login', 'last_online', 'email_verification_token', 'get_ban_actions']
    
    def get_last_online(self, obj):
        if obj.last_online:
            local_time = timezone.localtime(obj.last_online)
            time_diff = timezone.now() - obj.last_online
            
            if time_diff.total_seconds() < 300:
                return format_html('<span style="color: green; font-weight: bold;">● Online</span>')
            elif time_diff.total_seconds() < 3600:
                minutes = int(time_diff.total_seconds() / 60)
                return format_html('<span style="color: orange;">{} min ago</span>', minutes)
            elif time_diff.days == 0:
                return local_time.strftime('%I:%M %p')
            elif time_diff.days < 7:
                return format_html('<span style="color: gray;">{} days ago</span>', time_diff.days)
            else:
                return local_time.strftime('%m/%d/%y')
        return format_html('<span style="color: gray;">Never</span>')
    get_last_online.short_description = 'Last Online'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<int:user_id>/unban/', self.admin_site.admin_view(self.unban_user_view), name='accounts_user_unban'),
        ]
        return custom_urls + urls
    
    def unban_user_view(self, request, user_id):
        user = User.objects.get(pk=user_id)
        user.is_permanently_banned = False
        user.ban_until = None
        user.ban_reason = ''
        user.is_active = True
        user.save(update_fields=['is_permanently_banned', 'ban_until', 'ban_reason', 'is_active'])
        messages.success(request, f'User {user.email} has been unbanned successfully.')
        return redirect('admin:accounts_user_change', user_id)
    
    def get_ban_actions(self, obj):
        if obj.is_permanently_banned or (obj.ban_until and obj.ban_until > timezone.now()):
            return format_html(
                '<a class="button" href="{}unban/" style="background-color: #28a745; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">Unban User</a>',
                f'/admin/accounts/user/{obj.pk}/'
            )
        return format_html('<span style="color: green; font-weight: bold;">✓ User is not banned</span>')
    get_ban_actions.short_description = 'Quick Actions'
    
    def ban_status(self, obj):
        if obj.is_permanently_banned:
            return format_html('<span style="color: red; font-weight: bold;">Permanently Banned</span>')
        elif obj.ban_until and obj.ban_until > timezone.now():
            return format_html(
                '<span style="color: orange; font-weight: bold;">Banned until {}</span>',
                obj.ban_until.strftime('%m/%d/%y %I:%M %p')
            )
        elif not obj.is_active:
            return format_html('<span style="color: gray;">Inactive</span>')
        return format_html('<span style="color: green;">Active</span>')
    ban_status.short_description = 'Status'
    
    actions = ['ban_permanent', 'ban_30_days', 'ban_1_year', 'unban_users']
    
    def ban_permanent(self, request, queryset):
        queryset.update(is_permanently_banned=True, is_active=False)
        self.message_user(request, f"{queryset.count()} user(s) permanently banned.")
    ban_permanent.short_description = "Permanently ban selected users"
    
    def ban_30_days(self, request, queryset):
        ban_date = timezone.now() + timezone.timedelta(days=30)
        queryset.update(ban_until=ban_date, is_active=False, is_permanently_banned=False)
        self.message_user(request, f"{queryset.count()} user(s) banned for 30 days.")
    ban_30_days.short_description = "Ban selected users for 30 days"
    
    def ban_1_year(self, request, queryset):
        ban_date = timezone.now() + timezone.timedelta(days=365)
        queryset.update(ban_until=ban_date, is_active=False, is_permanently_banned=False)
        self.message_user(request, f"{queryset.count()} user(s) banned for 1 year.")
    ban_1_year.short_description = "Ban selected users for 1 year"
    
    def unban_users(self, request, queryset):
        queryset.update(is_permanently_banned=False, ban_until=None, is_active=True, ban_reason='')
        self.message_user(request, f"{queryset.count()} user(s) unbanned.")
    unban_users.short_description = "Unban selected users"


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ['sender', 'message', 'is_admin', 'is_read', 'created_at']
    fields = ['sender', 'message', 'is_admin', 'is_read', 'created_at']
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False

@admin.register(ChatRoom, site=admin_site)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'subject', 'status',  
        'get_unread_count', 'last_message_at', 'created_at'
    ]
    list_filter = ['status', 'created_at']  
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'subject']
    list_editable = ['status']  
    inlines = [ChatMessageInline]
    readonly_fields = ['user', 'created_at', 'updated_at', 'last_message_at', 'get_message_count', 'get_reply_form']
    
    fieldsets = (
        ('Chat Information', {
            'fields': ('user', 'subject', 'status') 
        }),
        ('Quick Reply', {
            'fields': ('get_reply_form',),
            'description': 'Send a reply to the user'
        }),
        ('Statistics', {
            'fields': ('get_message_count',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_message_at'),
            'classes': ('collapse',)
        }),
    )
        
    def get_unread_count(self, obj):
        count = obj.unread_count_for_admin
        if count > 0:
            return format_html(
                '<span style="background-color: #dc3545; color: white; padding: 4px 8px; border-radius: 12px; font-weight: bold;">{}</span>',
                count
            )
        return format_html('<span style="color: green;">✓</span>')
    get_unread_count.short_description = 'Unread'
    
    def get_message_count(self, obj):
        count = obj.messages.count()
        return format_html(
            '<span style="font-size: 16px; font-weight: bold;">{} messages</span>',
            count
        )
    get_message_count.short_description = 'Total Messages'
    
    def get_reply_form(self, obj):
        if obj.pk:
            return format_html(
                '''
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 10px;">
                    <form method="post" action="">
                        <input type="hidden" name="csrfmiddlewaretoken" value="{}">
                        <input type="hidden" name="action" value="send_reply">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-weight: bold; margin-bottom: 8px;">Reply Message:</label>
                            <textarea name="reply_message" rows="4" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit;" required placeholder="Type your reply here..."></textarea>
                        </div>
                        <button type="submit" style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                            Send Reply
                        </button>
                    </form>
                </div>
                ''',
                self._get_csrf_token()
            )
        return ''
    get_reply_form.short_description = 'Send Reply'
    
    def _get_csrf_token(self):
        from django.middleware.csrf import get_token
        request = getattr(self, '_request', None)
        if request:
            return get_token(request)
        return ''
    
    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        self._request = request
        
        if request.method == 'POST' and request.POST.get('action') == 'send_reply':
            reply_message = request.POST.get('reply_message', '').strip()
            if reply_message and object_id:
                try:
                    chat_room = ChatRoom.objects.get(pk=object_id)
                    ChatMessage.objects.create(
                        chat_room=chat_room,
                        sender=request.user,
                        message=reply_message,
                        is_admin=True
                    )
                    messages.success(request, 'Reply sent successfully!')
                    
                    if chat_room.status == 'open':
                        chat_room.status = 'in_progress'
                        chat_room.save()
                    
                    return redirect(request.path)
                except ChatRoom.DoesNotExist:
                    messages.error(request, 'Chat room not found')
        
        return super().changeform_view(request, object_id, form_url, extra_context)
    
    def has_add_permission(self, request):
        return False