import React from 'react';
import { MobileSettings } from '../../components/mobile/MobileSettings';
import { PageWrapper } from '../../components/layout/PageWrapper';

export default function FacultySettings() {
  return (
    <PageWrapper role="faculty" showGreeting={false}>
      <MobileSettings roleName="Faculty" />
    </PageWrapper>
  );
}
