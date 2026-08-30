<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * The system's configurable settings, with their defaults.
 *
 * Every setting is declared here with a default and a validation rule. A key
 * that isn't declared cannot be written — otherwise the settings endpoint
 * would be an open key/value store that any client could stuff anything into,
 * and nothing downstream could trust what it read back.
 *
 * Reads are cached because the appearance settings are fetched on every page
 * load by every user, and they change perhaps twice a year.
 */
class Settings
{
    private const CACHE_KEY = 'settings.all';

    /**
     * Declared settings: default value, validation rules, and the group the
     * admin UI files them under.
     */
    public const SCHEMA = [
        // General
        'school_name' => ['group' => 'general', 'default' => 'University of Professional Studies, Accra', 'rules' => ['nullable', 'string', 'max:150']],
        // The navbar has room for a word, not a sentence. Derived short names
        // are worse than useless here — the first word of the default is
        // "University" — so the abbreviation is its own setting.
        'short_name' => ['group' => 'general', 'default' => 'UPSA', 'rules' => ['nullable', 'string', 'max:16']],
        'department' => ['group' => 'general', 'default' => 'Department of Information Technology Studies', 'rules' => ['nullable', 'string', 'max:150']],
        'academic_year' => ['group' => 'general', 'default' => '2025/2026', 'rules' => ['nullable', 'string', 'max:32']],
        'current_session' => ['group' => 'general', 'default' => 'Second Semester', 'rules' => ['nullable', 'string', 'max:64']],

        // Appearance
        'primary_color' => ['group' => 'appearance', 'default' => '#0f2d5c', 'rules' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/']],
        'secondary_color' => ['group' => 'appearance', 'default' => '#071e3d', 'rules' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/']],
        'accent_color' => ['group' => 'appearance', 'default' => '#c9a227', 'rules' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/']],
        'font_family' => ['group' => 'appearance', 'default' => 'Roboto', 'rules' => ['nullable', 'string', 'max:64']],
        'logo_url' => ['group' => 'appearance', 'default' => null, 'rules' => ['nullable', 'string', 'max:2048']],

        // Submission rules
        'allowed_file_types' => ['group' => 'submissions', 'default' => ['pdf', 'doc', 'docx'], 'rules' => ['nullable', 'array', 'max:12']],
        'max_file_size_mb' => ['group' => 'submissions', 'default' => 20, 'rules' => ['nullable', 'integer', 'min:1', 'max:100']],
        'proposal_deadline' => ['group' => 'submissions', 'default' => null, 'rules' => ['nullable', 'date']],
        'final_deadline' => ['group' => 'submissions', 'default' => null, 'rules' => ['nullable', 'date']],
        'max_revisions' => ['group' => 'submissions', 'default' => 0, 'rules' => ['nullable', 'integer', 'min:0', 'max:20']],

        // Notifications
        'notify_on_submission' => ['group' => 'notifications', 'default' => true, 'rules' => ['nullable', 'boolean']],
        'notify_on_review' => ['group' => 'notifications', 'default' => true, 'rules' => ['nullable', 'boolean']],
        'notify_on_revision' => ['group' => 'notifications', 'default' => true, 'rules' => ['nullable', 'boolean']],
        'notify_on_approval' => ['group' => 'notifications', 'default' => true, 'rules' => ['nullable', 'boolean']],
        'email_notifications' => ['group' => 'notifications', 'default' => true, 'rules' => ['nullable', 'boolean']],
    ];

    /**
     * Which settings every signed-in user may read.
     *
     * Appearance and general branding have to reach the browser to be applied
     * at all, and the submission rules are the limits the upload form should
     * enforce before wasting the student's time on a file the server will
     * reject. Nothing else is exposed.
     */
    public const PUBLIC_GROUPS = ['general', 'appearance', 'submissions'];

    public function all(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            $stored = Setting::pluck('value', 'key')->all();

            $resolved = [];
            foreach (self::SCHEMA as $key => $meta) {
                $resolved[$key] = array_key_exists($key, $stored) ? $stored[$key] : $meta['default'];
            }

            return $resolved;
        });
    }

    public function get(string $key): mixed
    {
        return $this->all()[$key] ?? null;
    }

    /**
     * The subset a non-admin is allowed to read.
     */
    public function public(): array
    {
        $all = $this->all();

        return array_intersect_key(
            $all,
            array_filter(self::SCHEMA, fn ($meta) => in_array($meta['group'], self::PUBLIC_GROUPS, true))
        );
    }

    /**
     * Write the given settings, ignoring any key not in the schema.
     *
     * Returns the keys that actually changed, so the caller can record what
     * an administrator altered rather than logging every save as a change to
     * everything.
     */
    public function put(array $values): array
    {
        $before = $this->all();
        $changed = [];

        foreach ($values as $key => $value) {
            if (! isset(self::SCHEMA[$key])) {
                continue;
            }

            Setting::updateOrCreate(['key' => $key], ['value' => $value]);

            if (($before[$key] ?? null) !== $value) {
                $changed[] = $key;
            }
        }

        Cache::forget(self::CACHE_KEY);

        return $changed;
    }

    /**
     * The validation rules for a settings write, built from the schema so a
     * new setting needs declaring in exactly one place.
     */
    public static function validationRules(): array
    {
        $rules = [];

        foreach (self::SCHEMA as $key => $meta) {
            $rules[$key] = array_merge(['sometimes'], $meta['rules']);
        }

        // Each allowed extension, checked individually — an array rule says
        // nothing about what the array contains.
        $rules['allowed_file_types.*'] = ['string', 'alpha_num', 'max:10'];

        return $rules;
    }

    public static function groups(): array
    {
        return array_unique(array_column(self::SCHEMA, 'group'));
    }
}
