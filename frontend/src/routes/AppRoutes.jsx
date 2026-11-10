import React from 'react';
import DashboardPage from '../pages/DashboardPage.jsx';
import InventoryPage from '../pages/InventoryPage.jsx';

export default function AppRoutes(props) {
  if (props.page === 'Dashboard') {
    return <DashboardPage data={props.data} go={props.go} />;
  }
  return <InventoryPage {...props} />;
}
