import { useLocation, useNavigate , Navigate } from 'react-router-dom';
import { ReactElement, useEffect, useState } from "react";
import { toast } from 'react-toastify';

import { pb } from '../../config/pocketbase';
import PageLoader from '../../components/feedback/PageLoader';

export default function ActionPage(): ReactElement {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    if(!mode || !oobCode) { return; }
    if (mode === 'verifyEmail') {
      void verifyEmail(oobCode);
    }
    setLoading(false);
  }, [mode, oobCode]);

  const verifyEmail = async (oobCode: string) => {
    try {
      await pb.collection("users").confirmVerification(oobCode);
      toast.success("E-Mail erfolgreich bestätigt.");
      navigate("/album");
    } catch (error) {
      toast.error("Fehler bei der E-Mail-Bestätigung.");
      console.error("Error on verifying email: ", error);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if(mode === "resetPassword") { return <Navigate to="/resetPassword" state={oobCode}/> }

  return <div />
};
