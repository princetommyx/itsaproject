<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AssessorController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\ProjectDocumentController;
use App\Http\Controllers\Api\ProjectVersionController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StudentController;
use Illuminate\Support\Facades\Route;

// Tighter than the general API limiter — these are unauthenticated,
// credential-guessing-shaped endpoints (login, and the two password-reset
// steps), so they get their own stricter per-IP throttle. withoutMiddleware
// drops the general 60/min limiter here: it can never bind tighter than this
// 10/min one, so running both just doubles the rate-limit cache round trips
// (each check is a DB read+write with CACHE_STORE=database) for no benefit.
Route::middleware('throttle:10,1')->withoutMiddleware('throttle:api')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/password/forgot', [AuthController::class, 'requestPasswordReset']);
    Route::post('/password/reset', [AuthController::class, 'resetPassword']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/password/change', [AuthController::class, 'changePassword']);

    // Branding and the submission limits reach every signed-in user: the app
    // can't render in the institution's colours without them, and the upload
    // form should apply the same limits the server will.
    Route::get('/settings', [SettingsController::class, 'public']);

    Route::middleware('password.changed')->group(function () {
        Route::get('/documents/{document}/download', [ProjectDocumentController::class, 'download']);

        // Submission history is readable by everyone who can already see the
        // project — the controller applies the same member/assessor/admin
        // rule the project pages do, so this sits outside the role prefixes.
        Route::get('/projects/{project}/versions', [ProjectVersionController::class, 'index']);
        Route::get('/projects/{project}/compare', [ProjectVersionController::class, 'compare']);

        Route::middleware('is.student')->prefix('student')->group(function () {
            Route::get('/project', [StudentController::class, 'current']);
            Route::post('/projects', [StudentController::class, 'store']);
            Route::put('/projects/{project}', [StudentController::class, 'update']);
            Route::post('/projects/{project}/members', [StudentController::class, 'addMember']);
            Route::delete('/projects/{project}/members/{member}', [StudentController::class, 'removeMember']);
            Route::post('/projects/{project}/submit', [StudentController::class, 'submit']);
            Route::post('/projects/{project}/documents', [ProjectDocumentController::class, 'store']);
            Route::post('/projects/{project}/documents/{document}/submit', [ProjectDocumentController::class, 'submit']);
            Route::delete('/projects/{project}/documents/{document}', [ProjectDocumentController::class, 'destroy']);
            Route::get('/notifications', [StudentController::class, 'notifications']);
            Route::post('/notifications/{notificationId}/read', [StudentController::class, 'markNotificationRead']);
            Route::get('/complaints', [ComplaintController::class, 'index']);
            Route::post('/complaints', [ComplaintController::class, 'store']);
        });

        Route::middleware('is.assessor')->prefix('assessor')->group(function () {
            Route::get('/projects', [AssessorController::class, 'assigned']);
            Route::get('/projects/{project}', [AssessorController::class, 'show']);
            Route::post('/projects/{project}/decide', [AssessorController::class, 'decide']);
            Route::get('/notifications', [AssessorController::class, 'notifications']);
            Route::post('/notifications/{notificationId}/read', [AssessorController::class, 'markNotificationRead']);
        });

        Route::middleware('is.admin')->prefix('admin')->group(function () {
            Route::get('/dashboard', [AdminController::class, 'dashboard']);
            Route::post('/students/import', [AdminController::class, 'importStudents']);
            Route::get('/staff', [AdminController::class, 'staff']);
            Route::post('/staff', [AdminController::class, 'createStaff']);
            Route::get('/assessors', [AdminController::class, 'assessors']);
            Route::get('/students', [AdminController::class, 'students']);
            Route::get('/students/{student}', [AdminController::class, 'showStudent']);
            Route::get('/projects', [AdminController::class, 'allProjects']);
            Route::get('/groups', [AdminController::class, 'groups']);
            Route::get('/projects/unassigned', [AdminController::class, 'unassignedProjects']);
            Route::get('/projects/export', [AdminController::class, 'exportProjects']);
            Route::get('/projects/{project}', [AdminController::class, 'showProject']);
            Route::post('/projects/{project}/assign', [AdminController::class, 'assignAssessor']);
            Route::post('/projects/{project}/decide', [AdminController::class, 'decideProject']);
            Route::post('/projects/{project}/members', [AdminController::class, 'addProjectMember']);
            Route::delete('/projects/{project}/members/{member}', [AdminController::class, 'removeProjectMember']);
            Route::put('/projects/{project}/defense', [AdminController::class, 'setDefenseDates']);
            Route::get('/diagnostics', [AdminController::class, 'diagnostics']);
            Route::get('/login-logs', [AdminController::class, 'loginLogs']);
            Route::get('/complaints', [AdminController::class, 'complaints']);
            Route::put('/complaints/{complaint}', [AdminController::class, 'updateComplaint']);
            // is.admin says which area of the app you reach; can.do says what
            // you may do inside it — so a Project Coordinator can work in the
            // admin area without being able to rewrite the system's settings.
            Route::middleware('can.do:settings.manage')->group(function () {
                Route::get('/settings', [SettingsController::class, 'index']);
                Route::put('/settings', [SettingsController::class, 'update']);
                Route::post('/settings/logo', [SettingsController::class, 'uploadLogo']);
                Route::delete('/settings/logo', [SettingsController::class, 'removeLogo']);
            });

            Route::middleware('can.do:roles.manage')->group(function () {
                Route::get('/roles', [RoleController::class, 'index']);
                Route::post('/roles', [RoleController::class, 'store']);
                Route::put('/roles/{role}', [RoleController::class, 'update']);
                Route::delete('/roles/{role}', [RoleController::class, 'destroy']);
                Route::put('/users/{user}/role', [RoleController::class, 'assign']);
            });

            Route::get('/audit-logs', [AdminController::class, 'auditLogs'])
                ->middleware('can.do:audit.view');
            Route::get('/notifications', [AdminController::class, 'notifications']);
            Route::post('/notifications/{notificationId}/read', [AdminController::class, 'markNotificationRead']);
        });
    });
});
