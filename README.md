# Google Search Console Updater

> **English:** [README.en.md](README.en.md)

**Индексация URL + SEO-аудит по данным Search Console — с вашим AI-ключом.**

```bash
# macOS (Apple Silicon)
# скачайте Google-Search-Console-Updater-2.0.0-mac-arm64.zip из Releases
xattr -cr "Google Search Console Updater.app"
open "Google Search Console Updater.app"
```

**Версия:** 2.0.0 · **Исходный код:** [github.com/Marfa/Google_Search_Console_Index_Updater](https://github.com/Marfa/Google_Search_Console_Index_Updater) · **Лицензия:** [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)

> Коммерческое использование без отдельного согласования не допускается.

## Скриншот

![Google Search Console Updater](docs/screenshot.png)

## Возможности

| | |
|---|---|
| Индексация | URL Inspection + запрос индексирования для страниц вне индекса |
| Аудит сайта | Baseline Search Analytics (28/90 дней), sitemaps, ИИ-отчёт |
| Ваш AI | OpenAI-compatible: OpenAI, Groq, xAI Grok, OpenRouter… |
| Импорт / экспорт | `.txt` `.csv` `.xls` `.xlsx` → CSV; аудит → Markdown |
| Язык | RU / EN, включая OAuth callback |
| Обновления | Автопроверка [GitHub Releases](https://github.com/Marfa/Google_Search_Console_Index_Updater/releases) |

## Скачивание

Готовые portable-сборки: [Releases](https://github.com/Marfa/Google_Search_Console_Index_Updater/releases).

| Платформа | Файл |
|-----------|------|
| macOS arm64 | `Google-Search-Console-Updater-2.0.0-mac-arm64.zip` |
| Windows x64 | `Google-Search-Console-Updater-<версия>-win-x64.zip` |

### Windows (x64)

1. Скачайте zip → распакуйте  
2. Запустите `Google Search Console Updater.exe`  

Установка не нужна.

### macOS (Apple Silicon)

1. Скачайте zip → распакуйте  
2. Откройте `Google Search Console Updater.app` (**ПКМ → Открыть** при первом запуске)

### Ошибка «приложение повреждено» (macOS)

```bash
xattr -cr "/путь/к/Google Search Console Updater.app"
codesign --force --deep --sign - "/путь/к/Google Search Console Updater.app"
```

С **v1.0.8** ad-hoc подпись ставится при сборке (`after-sign.cjs`).

## Настройка Google Cloud

Секреты не вшиты — каждый пользователь вводит свои OAuth-данные.

1. [Google Cloud Console](https://console.cloud.google.com/) → проект  
2. Включите API: [Search Console](https://console.cloud.google.com/apis/library/searchconsole.googleapis.com) и [Indexing](https://console.cloud.google.com/apis/library/indexing.googleapis.com)  
3. OAuth client ID типа **Desktop app** → Client ID / Secret  
4. **Audience → Test users** — ваш Google-email  

### 403: access_denied

В режиме Testing войдут только email из [Audience → Test users](https://console.cloud.google.com/auth/audience).

## Как пользоваться

### Индексация

1. Client ID / Secret → **Сохранить настройки**  
2. **Войти в Google**  
3. Список URL или **Импортировать URL из файла**  
4. **Проверить и запросить индексирование** → CSV при необходимости  

### Аудит сайта

1. Вкладка **Аудит сайта** → свойство Search Console  
2. AI base URL, модель, API-ключ → **Сохранить настройки ИИ**  
3. **Запустить аудит** → baseline + разметка отчёта → экспорт Markdown  

Ключ хранится локально (`safeStorage`), как OAuth.

#### Примеры AI-провайдеров

| Провайдер | AI base URL | Пример модели | Ключ |
|-----------|-------------|---------------|------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` | [platform.openai.com](https://platform.openai.com/) |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` | ключ `gsk_…` |
| xAI Grok | `https://api.x.ai/v1` | `grok-4.6` | [console.x.ai](https://console.x.ai/) (`xai-…`) |

> Имя переменной вроде `GROK_API` не значит xAI: ключ `gsk_…` — это Groq.

**Сбросить настройки** удаляет OAuth-данные и токены с устройства.

## Публикация OAuth для других

| Вариант | Когда |
|---------|--------|
| Test users (до 100) | Команда, без публикации |
| Publish app | Публичный доступ; scopes чувствительные → верификация Google |
| Свой OAuth у каждого | Рекомендуется: свой Cloud-проект, без publish |

## Автообновление

При запуске проверяются [Releases](https://github.com/Marfa/Google_Search_Console_Index_Updater/releases). Без подписи Apple на macOS чаще нужен **Скачать вручную**.

## Хранение данных

| Данные | Windows | macOS |
|--------|---------|-------|
| OAuth Client ID / Secret | `%APPDATA%\Google Search Console Updater\oauth-config.json` | `~/Library/Application Support/Google Search Console Updater/oauth-config.json` |
| Токены | `…\tokens.json` | `…/tokens.json` |
| API-ключ ИИ | `…\ai-config.json` | `…/ai-config.json` |
| Язык / AI URL / модель | `…\settings.json` | `…/settings.json` |

## Сборка

```bash
npm install
npm start
npm run build:mac   # → dist/Google-Search-Console-Updater-2.0.0-mac-arm64.zip
npm run build:win
npm run check:audit-helpers
```

## Лимиты API

| API | Лимит |
|-----|-------|
| URL Inspection | ~600 запросов/день на свойство |
| Indexing API | ~200 запросов/день |

## Поддержка

- [Исходный код](https://github.com/Marfa/Google_Search_Console_Index_Updater)
- [Донат](https://www.donationalerts.com/r/themarfa)
- [Донат криптой](https://nowpayments.io/donation/themarfa)

## Структура

```
├── electron/       # OAuth, GSC API, AI client, audit, auto-update
├── renderer/       # UI, вкладки Индексация / Аудит, i18n
├── scripts/        # build hooks, check-audit-helpers
├── build/          # иконка
├── config.example.json
└── package.json
```

## О проекте

Код подготовлен с помощью [Cursor](https://cursor.com/).

Поддержка проекта: [Донат](https://www.donationalerts.com/r/themarfa) · [Донат криптой](https://nowpayments.io/donation/themarfa)
