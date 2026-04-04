'use client';

import { use } from 'react';
import HandlePage from '../../../src/views/HandlePage';

export default function Handle({ params }) {
  const { path } = use(params);
  return <HandlePage path={path} />;
}
