import React from 'react';
import RollNumberManagement from './RollNumberManagement';

// Dedicated page for published roll number slips — split out from the
// combined tabbed page so Published/Unpublished each have their own route.
const PublishedRollSlips = () => <RollNumberManagement fixedTab="published" />;

export default PublishedRollSlips;
