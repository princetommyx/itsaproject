<?php

use Illuminate\Support\Facades\Route;

// This is a JSON API backend with no built frontend assets of its own (the
// actual UI is the separate React app) — the stock welcome view expects
// compiled Vite assets that don't exist here and 500s. Just say hello.
Route::get('/', function () {
    return response()->json(['message' => 'UPSA FYP System API']);
});
