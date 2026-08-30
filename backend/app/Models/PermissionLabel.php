<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['permission', 'name', 'description'])]
class PermissionLabel extends Model
{
    protected $primaryKey = 'permission';

    public $incrementing = false;

    protected $keyType = 'string';
}
