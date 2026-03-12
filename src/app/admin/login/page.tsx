"use client";

import React, { Suspense } from 'react';
import AdminLoginForm from '../../../components/admin/AdminLoginForm';

export default function AdminLoginPage() {
    return (
        <Suspense>
            <AdminLoginForm />
        </Suspense>
    );
}
