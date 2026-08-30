<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Settings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    public function __construct(private Settings $settings) {}

    /**
     * The settings every signed-in user needs: branding to render the app in
     * the institution's colours, and the submission limits the upload form
     * should enforce before wasting a student's time on a file the server
     * will reject anyway.
     */
    public function public()
    {
        return response()->json($this->settings->public());
    }

    public function index()
    {
        return response()->json([
            'settings' => $this->settings->all(),
            // Sent alongside the values so the admin UI groups fields the way
            // the schema does, instead of keeping its own copy of the layout
            // that drifts the moment a setting is added.
            'groups' => collect(Settings::SCHEMA)->map(fn ($meta) => $meta['group']),
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate(Settings::validationRules());

        $changed = $this->settings->put($validated);

        activity_log('settings.updated', null, ['keys' => $changed]);

        return response()->json([
            'settings' => $this->settings->all(),
            'changed' => $changed,
        ]);
    }

    /**
     * Replace the logo shown in the navigation.
     *
     * Stored on the public disk and recorded as a URL rather than a path, so
     * the front end can use it directly and a future move to object storage
     * changes nothing here.
     */
    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => ['required', 'image', 'mimes:png,jpg,jpeg,svg,webp', 'max:2048'],
        ]);

        $path = $request->file('logo')->store('branding', 'public');
        $url = Storage::disk('public')->url($path);

        $this->settings->put(['logo_url' => $url]);
        activity_log('settings.logo_updated', null, ['url' => $url]);

        return response()->json(['logo_url' => $url]);
    }

    public function removeLogo()
    {
        $this->settings->put(['logo_url' => null]);
        activity_log('settings.logo_removed');

        return response()->json(['logo_url' => null]);
    }
}
