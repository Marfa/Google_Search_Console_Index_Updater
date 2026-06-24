# Google Search Console Updater

> **English:** [README.en.md](README.en.md)

Portable-приложение для **Windows** и **macOS**. Проверяет URL через [Google Search Console URL Inspection API](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect) и запрашивает индексирование для страниц, которых нет в индексе.

**Исходный код:** [github.com/Marfa/Google_Search_Console_Index_Updater](https://github.com/Marfa/Google_Search_Console_Index_Updater)

**Лицензия:** [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

> Проект распространяется по лицензии CC BY-NC-SA 4.0. Коммерческое использование без отдельного согласования не допускается.

## Скриншот

![Google Search Console Updater](docs/screenshot.png)

## Возможности

- Авторизация через Google-аккаунт с доступом к Search Console
- Проверка списка URL через URL Inspection API
- Автоматический запрос индексирования для URL, которых нет в индексе
- Экспорт результатов в CSV
- Переключение языка интерфейса (русский / английский)
- Автообновление из [GitHub Releases](https://github.com/Marfa/Google_Search_Console_Index_Updater/releases)

## Скачивание

Готовые portable-сборки доступны в [Releases](https://github.com/Marfa/Google_Search_Console_Index_Updater/releases). Актуальные имена файлов указаны на странице релиза.

### Windows (x64)

1. Скачайте `Google-Search-Console-Updater-<версия>-win-x64.zip`
2. Распакуйте архив
3. Запустите `Google Search Console Updater.exe` из распакованной папки

Установка не требуется.

### macOS (Apple Silicon, arm64)

1. Скачайте `Google-Search-Console-Updater-<версия>-mac-arm64.zip`
2. Распакуйте архив
3. Откройте `Google Search Console Updater.app`

При первом запуске неподписанного приложения: **ПКМ → Открыть → Открыть**.

### Ошибка «приложение повреждено» (macOS)

Если macOS пишет, что приложение повреждено и в **Конфиденциальность и безопасность** нет кнопки «Всё равно открыть», у `.app` сломана подпись (типично для скачанного `.zip`). В Terminal:

```bash
xattr -cr "/путь/к/Google Search Console Updater.app"
codesign --force --deep --sign - "/путь/к/Google Search Console Updater.app"
```

После этого запустите через **ПКМ → Открыть**. В исходниках добавлено исправление подписи при сборке (`after-sign.cjs`).

## Настройка Google Cloud

Каждый пользователь использует **свои** OAuth-учётные данные. Секреты не встроены в приложение.

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте проект
3. Включите API:
   - [Google Search Console API](https://console.cloud.google.com/apis/library/searchconsole.googleapis.com)
   - [Web Search Indexing API](https://console.cloud.google.com/apis/library/indexing.googleapis.com)
4. Создайте **OAuth client ID** типа **Desktop app**
5. Скопируйте **Client ID** и **Client Secret**
6. В **Google Auth Platform → Audience** добавьте свой Google-email в **Test users**

### Ошибка 403: access_denied

Пока OAuth-приложение в режиме **Testing**, войти могут только email из **Test users**:

1. [Google Auth Platform → Audience](https://console.cloud.google.com/auth/audience)
2. **Test users → Add users**
3. Добавьте email, с которым входите в Search Console

## Как пользоваться

1. Введите Client ID и Client Secret → **Сохранить настройки**
2. **Войти в Google**
3. Вставьте список URL (по одному на строку)
4. Нажмите **Проверить и запросить индексирование**
5. Просмотрите результаты и при необходимости экспортируйте CSV

Кнопка **Сбросить настройки** удаляет сохранённые OAuth-данные и токены с устройства.

## Публикация OAuth-приложения для других пользователей

### Вариант 1: До 100 пользователей (без публикации)

Добавляйте email каждого пользователя в **Audience → Test users**. Подходит для команды.

### Вариант 2: Публичный доступ (Publish app)

1. Заполните **Branding** (название, email поддержки)
2. Добавьте scopes в **Data Access**
3. Нажмите **Publish app** в **Audience**

Scopes `webmasters` и `indexing` — чувствительные. Google, скорее всего, потребует **верификацию**:

- сайт приложения, privacy policy, terms of service;
- описание зачем нужен каждый scope;
- демонстрация OAuth-потока;
- заявка в **Verification Center**.

Срок верификации — от нескольких дней до недель.

### Вариант 3: Каждый пользователь со своим OAuth (рекомендуется)

Пользователь создаёт свой проект Google Cloud, вводит свои Client ID / Secret в приложение и добавляет свой email в Test users. Публикация не требуется.

## Автообновление

Упакованное приложение при запуске проверяет [GitHub Releases](https://github.com/Marfa/Google_Search_Console_Index_Updater/releases). При наличии новой версии загружает `.zip` и показывает кнопку **«Установить и перезапустить»**. Также можно проверить обновления вручную через **О программе**.

> На macOS без подписи Apple Developer автоустановка может не сработать. В этом случае нажмите **«Скачать вручную»** в баннере обновления или скачайте `.zip` из Releases и замените `.app`. На Windows скачайте новый `.zip`, распакуйте и замените папку с приложением.

## Хранение данных

Учётные данные **не хранятся в исходном коде**. Локально на устройстве пользователя:

| Данные | Путь (Windows) | Путь (macOS) |
|--------|----------------|--------------|
| OAuth Client ID / Secret | `%APPDATA%\Google Search Console Updater\oauth-config.json` | `~/Library/Application Support/Google Search Console Updater/oauth-config.json` |
| Токены авторизации | `%APPDATA%\Google Search Console Updater\tokens.json` | `~/Library/Application Support/Google Search Console Updater/tokens.json` |
| Язык интерфейса | `%APPDATA%\Google Search Console Updater\settings.json` | `~/Library/Application Support/Google Search Console Updater/settings.json` |

## Сборка из исходников

```bash
npm install
npm start
npm run build:mac   # macOS (arm64)
npm run build:win   # Windows (x64)
```

Артефакты появятся в `dist/`.

## Лимиты API

| API | Лимит |
|-----|-------|
| URL Inspection | ~600 запросов/день на свойство |
| Indexing API | ~200 запросов/день |

## Поддержка

- [Исходный код](https://github.com/Marfa/Google_Search_Console_Index_Updater)
- [Донат](https://www.donationalerts.com/r/themarfa)
- [Донат криптой](https://nowpayments.io/donation/themarfa)

## Структура проекта

```
├── electron/       # Main process, OAuth, API, автообновление
├── renderer/       # UI, i18n
├── build/          # Иконка приложения
├── config.example.json
├── LICENSE
└── package.json
```

## О проекте

Код подготовлен с помощью [Cursor](https://cursor.com/) — AI-редактора для разработки программного обеспечения.
