<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AssessorController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\StudentController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/password/forgot', [AuthController::class, 'requestPasswordReset']);
Route::post('/password/reset', [AuthController::class, 'resetPassword']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/password/change', [AuthController::class, 'changePassword']);

    Route::middleware('password.changed')->group(function () {
        Route::middleware('is.student')->prefix('student')->group(function () {
            Route::get('/project', [StudentController::class, 'current']);
            Route::post('/projects', [StudentController::class, 'store']);
            Route::put('/projects/{project}', [StudentController::class, 'update']);
            Route::post('/projects/{project}/members', [StudentController::class, 'addMember']);
            Route::delete('/projects/{project}/members/{member}', [StudentController::class, 'removeMember']);
            Route::post('/projects/{project}/submit', [StudentController::class, 'submit']);
            Route::get('/complaints', [ComplaintController::class, 'index']);
            Route::post('/complaints', [ComplaintController::class, 'store']);
        });

        Route::middleware('is.assessor')->prefix('assessor')->group(function () {
            Route::get('/projects', [AssessorController::class, 'assigned']);
            Route::get('/projects/{project}', [AssessorController::class, 'show']);
            Route::post('/projects/{project}/decide', [AssessorController::class, 'decide']);
        });

        Route::middleware('is.admin')->prefix('admin')->group(function () {
            Route::get('/dashboard', [AdminController::class, 'dashboard']);
            Route::post('/students/import', [AdminController::class, 'importStudents']);
            Route::post('/staff', [AdminController::class, 'createStaff']);
            Route::get('/assessors', [AdminController::class, 'assessors']);
            Route::get('/projects', [AdminController::class, 'allProjects']);
            Route::get('/projects/unassigned', [AdminController::class, 'unassignedProjects']);
            Route::get('/projects/export', [AdminController::class, 'exportProjects']);
            Route::get('/projects/{project}', [AdminController::class, 'showProject']);
            Route::post('/projects/{project}/assign', [AdminController::class, 'assignAssessor']);
            Route::post('/projects/{project}/decide', [AdminController::class, 'decideProject']);
            Route::get('/login-logs', [AdminController::class, 'loginLogs']);
            Route::get('/complaints', [AdminController::class, 'complaints']);
            Route::put('/complaints/{complaint}', [AdminController::class, 'updateComplaint']);
        });
    });
});
