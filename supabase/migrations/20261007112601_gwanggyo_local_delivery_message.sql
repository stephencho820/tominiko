update public.delivery_settings
set local_delivery_message='광교·서광교 이웃에게는 Casa di Stefano가 직접 배송해 드려요.',
    updated_at=now()
where id=true;
