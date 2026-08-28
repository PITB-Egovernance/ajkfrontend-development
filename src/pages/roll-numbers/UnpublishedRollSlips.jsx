import React from 'react';
import RollNumberManagement from './RollNumberManagement';

// Dedicated page for unpublished roll number slips — split out from the
// combined tabbed page so Published/Unpublished each have their own route.
const UnpublishedRollSlips = () => <RollNumberManagement fixedTab="unpublished" />;

export default UnpublishedRollSlips;
