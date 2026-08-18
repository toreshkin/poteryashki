-- Тестовые заявки по Бишкеку. Секретный код у всех: TEST01
-- (hash = sha256('TEST01') в hex)
insert into public.reports
  (report_type, animal_type, name, description, landmarks, lat, lng, contact_phone, contact_telegram, status, secret_code_hash, event_date)
values
  ('lost', 'dog', 'Барсик', 'Рыжий пёс, дворняга, среднего размера. Был в синем ошейнике.', 'Возле парка Панфилова, у входа со стороны ул. Киевской', 42.8765, 74.6035, '+996555123456', null, 'active', '5d3d87414e6c80b79dca8bfaa44ef284e23969de5f4f1f8dde7337b5f4b3da31', current_date - 2),
  ('lost', 'cat', 'Мурка', 'Серая кошка с белыми лапками, очень пугливая.', 'Микрорайон Джал, около 12-й школы', 42.8341, 74.5623, null, '@murka_owner', 'active', '5d3d87414e6c80b79dca8bfaa44ef284e23969de5f4f1f8dde7337b5f4b3da31', current_date - 5),
  ('found', 'dog', null, 'Найден щенок овчарки, около 4 месяцев. Дружелюбный, без ошейника.', 'Ошский рынок, южная сторона', 42.8703, 74.5698, '+996700987654', null, 'active', '5d3d87414e6c80b79dca8bfaa44ef284e23969de5f4f1f8dde7337b5f4b3da31', current_date - 1),
  ('found', 'cat', null, 'Найден белый кот, ухоженный, явно домашний.', 'Двор по ул. Токтогула 125', 42.8735, 74.5900, null, '@bishkek_finder', 'active', '5d3d87414e6c80b79dca8bfaa44ef284e23969de5f4f1f8dde7337b5f4b3da31', current_date),
  ('lost', 'other', 'Кеша', 'Улетел волнистый попугай, зелёный с жёлтой головой.', 'Район Восток-5', 42.8790, 74.6410, '+996555111222', '@kesha_home', 'resolved', '5d3d87414e6c80b79dca8bfaa44ef284e23969de5f4f1f8dde7337b5f4b3da31', current_date - 10);
