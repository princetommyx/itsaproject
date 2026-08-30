# ToastMagic runtime assets

Copied verbatim from `backend/vendor/devrabiul/laravel-toaster-magic/assets`.

The package is a Blade package: its PHP side flashes toasts into the session
for the next Blade render. This application is a React SPA against a JSON API
and has no Blade views, so only the browser runtime is used — the CSS and the
`window.toastMagic` object it defines. `src/context/ToastContext.jsx` drives it.

The composer package is still a real dependency: it is where these files come
from, so `composer update` is what refreshes them. After updating it, re-sync
with:

    npm run sync:toast-magic
