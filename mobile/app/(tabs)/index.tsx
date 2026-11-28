import React from "react";
import { useRole } from "../../src/context/RoleContext";
import { CustomerHomeScreen } from "../../src/screens/customer/CustomerHomeScreen";
import { OwnerDashboardScreen } from "../../src/screens/owner/OwnerDashboardScreen";
import { AdminDashboardScreen } from "../../src/screens/admin/AdminDashboardScreen";

export default function HomeTab() {
  const { role, isAuthenticated } = useRole();

  if (isAuthenticated && role === "ADMIN") {
    return <AdminDashboardScreen />;
  }
  if (isAuthenticated && role === "OWNER") {
    return <OwnerDashboardScreen />;
  }
  return <CustomerHomeScreen />;
}
