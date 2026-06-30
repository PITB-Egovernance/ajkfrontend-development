# Backend Implementation: Advertisement Edit Change Logs

Frontend now sends advertisement edit changes in the update payload. Backend should persist these values on the `advertisements` table and apply job removals/count updates to the advertisement job relation.

## 1. Migration

Add JSON columns to `advertisements`:

```php
Schema::table('advertisements', function (Blueprint $table) {
    if (!Schema::hasColumn('advertisements', 'change_logs')) {
        $table->json('change_logs')->nullable()->after('terms_conditions');
    }

    if (!Schema::hasColumn('advertisements', 'advertisement_change_logs')) {
        $table->json('advertisement_change_logs')->nullable()->after('change_logs');
    }
});
```

## 2. Model Casts

In `Advertisement` model:

```php
protected $casts = [
    'terms_conditions' => 'array',
    'change_logs' => 'array',
    'advertisement_change_logs' => 'array',
];
```

Also add these fields to `$fillable` if the model uses guarded fillable fields.

## 3. Update Endpoint Payload

Frontend sends these fields on `PUT /advertisements/{id}/update`:

```json
{
  "job_ids": ["job_hash_1", "job_hash_2"],
  "removed_job_ids": ["deleted_job_hash"],
  "deleted_job_ids": ["deleted_job_hash"],
  "job_post_counts": {
    "job_hash_1": 5,
    "job_hash_2": 2
  },
  "jobs": [
    { "id": "job_hash_1", "job_id": "job_hash_1", "hash_id": "job_hash_1", "num_posts": 5 }
  ],
  "change_logs": [
    {
      "type": "count_changed",
      "field": "num_posts",
      "label": "No. of Posts",
      "job_id": "job_hash_1",
      "designation": "Assistant",
      "before": 10,
      "after": 5,
      "message": "Assistant posts changed from 10 to 5."
    },
    {
      "type": "deleted",
      "field": "job_deleted",
      "label": "Deleted Post",
      "job_id": "deleted_job_hash",
      "designation": "Clerk",
      "before": "Clerk (3 posts)",
      "after": "Deleted",
      "message": "Clerk deleted from advertisement. Previous requisition posts: 3."
    }
  ],
  "advertisement_change_logs": []
}
```

## 4. Controller Update Logic

In `AdvertisementController@update`, after validating normal advertisement fields:

```php
$changeLogs = $request->input('advertisement_change_logs', $request->input('change_logs', []));

if (is_string($changeLogs)) {
    $decoded = json_decode($changeLogs, true);
    $changeLogs = json_last_error() === JSON_ERROR_NONE ? $decoded : [];
}

$advertisement->update([
    'closing_date' => $request->closing_date,
    'advertisement_fee' => $request->advertisement_fee,
    'note' => $request->note,
    'important_notes' => $request->important_notes,
    'terms_conditions' => $request->terms_conditions,
    'status' => $request->status,
    'extend_date' => $request->extend_date,
    'change_logs' => $changeLogs,
    'advertisement_change_logs' => $changeLogs,
]);
```

## 5. Delete Jobs From Advertisement

Detach removed jobs from the advertisement relation:

```php
$removedJobIds = $request->input('removed_job_ids', $request->input('deleted_job_ids', []));

if (is_string($removedJobIds)) {
    $decoded = json_decode($removedJobIds, true);
    $removedJobIds = json_last_error() === JSON_ERROR_NONE
        ? $decoded
        : array_filter(explode(',', $removedJobIds));
}

if (!empty($removedJobIds)) {
    $advertisement->jobDetails()->detach($removedJobIds);
}
```

Use the actual relation name if it is not `jobDetails()`.

## 6. Update Per-Job Post Counts

Persist edited post counts against the advertisement job pivot or copied job detail row:

```php
$postCounts = $request->input('job_post_counts', $request->input('job_counts', []));

if (is_string($postCounts)) {
    $decoded = json_decode($postCounts, true);
    $postCounts = json_last_error() === JSON_ERROR_NONE ? $decoded : [];
}

foreach ($postCounts as $jobId => $count) {
    $count = max(1, (int) $count);

    $advertisement->jobDetails()->updateExistingPivot($jobId, [
        'num_posts' => $count,
    ]);

    // If your advertisement displays copied job rows instead of pivot count,
    // update that advertisement-specific row here as well.
}
```

If `num_posts` lives on `job_details` directly and must be changed globally:

```php
JobDetail::whereIn('hash_id', array_keys($postCounts))->get()->each(function ($job) use ($postCounts) {
    $job->update(['num_posts' => max(1, (int) $postCounts[$job->hash_id])]);
});
```

Prefer advertisement-specific pivot/copy update so original requisition data stays unchanged.

## 7. API Response

Return these fields in advertisement list/detail:

```php
return [
    // existing fields...
    'change_logs' => $advertisement->change_logs ?? [],
    'advertisement_change_logs' => $advertisement->advertisement_change_logs ?? [],
    'job_details' => $advertisement->jobDetails->map(function ($job) {
        return [
            // existing job fields...
            'num_posts' => $job->pivot->num_posts ?? $job->num_posts,
            'change_logs' => [],
        ];
    }),
];
```

Frontend already reads:

- `advertisement_change_logs`
- `change_logs`
- `change_logs_json`
- per-job `change_logs`

