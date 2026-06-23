import React from "react";
import { Navigate, useParams } from "react-router-dom";

const ClientDashboard = () => {
  const { clientId } = useParams();
  const target = clientId ? `/client-portal/${clientId}/dashboard` : "/client-portal/dashboard";
  return <Navigate to={target} replace />;
};

export default ClientDashboard;
