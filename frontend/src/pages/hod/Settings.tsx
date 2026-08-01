import React from 'react';
import { MobileSettings } from '../../components/mobile/MobileSettings';
import { PageWrapper } from '../../components/layout/PageWrapper';

export default function HODSettings() {
  return (
    <PageWrapper role="hod" showGreeting={false}>
      <MobileSettings roleName="HOD" />
    </PageWrapper>
  );
}
