/**
 * Role-to-Dashboard Route Resolution Utility
 * 
 * Maps authenticated backend roles strictly to their dedicated SaaS portals:
 * - ROLE_APP_DEVELOPER   -> /admin/developer
 * - ROLE_SERVICE_TEAM    -> /admin/service-team
 * - ROLE_COMPANY_ADMIN   -> /admin/company
 * - ROLE_SUPER_ADMIN     -> /admin/super-admin
 */

export const getAdminDashboardRoute = (roles: string[] = []): string => {
  if (roles.includes('ROLE_SUPER_ADMIN') || roles.includes('SUPER_ADMIN')) {
    return '/admin/super-admin';
  }
  if (roles.includes('ROLE_APP_DEVELOPER') || roles.includes('APP_DEVELOPER')) {
    return '/admin/developer';
  }
  if (
    roles.includes('ROLE_SERVICE_TEAM') ||
    roles.includes('SERVICE_TEAM') ||
    roles.includes('ROLE_MANAGEMENT_TEAM') ||
    roles.includes('MANAGEMENT_TEAM')
  ) {
    return '/admin/service-team';
  }
  if (roles.includes('ROLE_COMPANY_ADMIN') || roles.includes('COMPANY_ADMIN')) {
    return '/admin/company';
  }
  if (roles.includes('ROLE_PLATFORM_ADMIN') || roles.includes('PLATFORM_ADMIN')) {
    return '/admin/super-admin';
  }
  return '/admin-login';
};

export const getPostLoginRoute = (roles: string[] = []): string => {
  if (roles.includes('ROLE_SUPER_ADMIN') || roles.includes('SUPER_ADMIN')) {
    return '/admin/super-admin';
  }
  if (roles.includes('ROLE_APP_DEVELOPER') || roles.includes('APP_DEVELOPER')) {
    return '/admin/developer';
  }
  if (
    roles.includes('ROLE_SERVICE_TEAM') ||
    roles.includes('SERVICE_TEAM') ||
    roles.includes('ROLE_MANAGEMENT_TEAM') ||
    roles.includes('MANAGEMENT_TEAM')
  ) {
    return '/admin/service-team';
  }
  if (roles.includes('ROLE_COMPANY_ADMIN') || roles.includes('COMPANY_ADMIN')) {
    return '/admin/company';
  }
  if (roles.includes('ROLE_PLATFORM_ADMIN') || roles.includes('PLATFORM_ADMIN')) {
    return '/admin/super-admin';
  }
  if (roles.includes('ROLE_HR') || roles.includes('HR')) {
    return '/hr-analytics';
  }
  if (roles.includes('ROLE_CANDIDATE') || roles.includes('CANDIDATE')) {
    return '/jobs';
  }
  return '/';
};
