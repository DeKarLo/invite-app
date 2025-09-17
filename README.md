# Invite App (Node.js + Express + MongoDB Atlas)

RSVP приложение с персональными ссылками `/invite/:name`, инициализацией гостей из JSON и API.

## Локальный запуск

1) Склонировать репозиторий и перейти в папку:
```bash
npm i
cp .env.example .env
# В .env укажи MONGODB_URI (строка подключения Atlas)
npm run dev
```
2) Открыть: http://localhost:3000/invite/Karen

## Структура документа гостя
```json
{
  "name": "Karen",
  "attending": null
}
```

## API
- `GET /api/guests` — список гостей с их статусами.
- `POST /api/respond/:name` — body: `{ "attending": true | false }`

Пример:
```bash
curl -X POST http://localhost:3000/api/respond/Karen \
  -H "Content-Type: application/json" \
  -d '{"attending": true}'
```

## Инициализация гостей
При первом запуске, если коллекция пустая — данные берутся из `guests.json`.
Поддерживаются два формата:
```json
["Karen", "Mariam"]
```
или
```json
{ "names": ["Karen", "Mariam"] }
```

## Деплой на Render
1. Создай новый **Web Service** на https://render.com
2. Подключи Git-репозиторий.
3. Build command: `npm install`
4. Start command: `npm start`
5. В **Environment** добавь:
   - `MONGODB_URI=...` (строка подключения MongoDB Atlas)
   - (опционально) `DB_NAME=invite_db`
6. Подожди, пока Render задеплоит. Открой:
   ```
   https://<your-service>.onrender.com/invite/Karen
   ```

## Примечания
- Поиск гостя по имени — регистронезависимый (например, `/invite/karen` тоже сработает).
- Если гость уже ответил, кнопки блокируются и показывается выбранный статус.
- Healthcheck: `/health`
