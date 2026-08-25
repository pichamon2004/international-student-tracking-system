import { Router } from 'express';
import {
  getRoles, createRole, updateRole, deleteRole,
  getRolePermissions, updateRolePermissions,
  getModules, createModule, updateModule, deleteModule,
  getUserRoles, assignRoleToUser, removeRoleFromUser,
} from '../controllers/role.controller';
import { authenticate, requirePermission, requireAnyPermission } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

router.use(authenticate);

// ── Modules ───────────────────────────────────────────────────────
router.get('/modules',       requirePermission('ROLE_MANAGEMENT.view'),   asyncHandler(getModules));
router.post('/modules',      requirePermission('ROLE_MANAGEMENT.create'), asyncHandler(createModule));
router.put('/modules/:id',   requirePermission('ROLE_MANAGEMENT.edit'),   asyncHandler(updateModule));
router.delete('/modules/:id',requirePermission('ROLE_MANAGEMENT.delete'), asyncHandler(deleteModule));

// ── Roles CRUD ────────────────────────────────────────────────────
// GET is also used by User Management (to populate the role-assignment
// dropdown), so staff with USER_MANAGEMENT.view but not ROLE_MANAGEMENT.view
// can still read the plain role list.
router.get('/',    requireAnyPermission('ROLE_MANAGEMENT.view', 'USER_MANAGEMENT.view'),   asyncHandler(getRoles));
router.post('/',   requirePermission('ROLE_MANAGEMENT.create'), asyncHandler(createRole));
router.put('/:id', requirePermission('ROLE_MANAGEMENT.edit'),   asyncHandler(updateRole));
router.delete('/:id', requirePermission('ROLE_MANAGEMENT.delete'), asyncHandler(deleteRole));

// ── Role Permissions ──────────────────────────────────────────────
router.get('/:id/permissions', requirePermission('ROLE_MANAGEMENT.view'), asyncHandler(getRolePermissions));
router.put('/:id/permissions', requirePermission('ROLE_MANAGEMENT.edit'), asyncHandler(updateRolePermissions));

// ── User ↔ Role ───────────────────────────────────────────────────
router.get('/users/:id/roles',             requirePermission('USER_MANAGEMENT.view'), asyncHandler(getUserRoles));
router.post('/users/:id/roles',            requirePermission('USER_MANAGEMENT.edit'), asyncHandler(assignRoleToUser));
router.delete('/users/:id/roles/:roleId',  requirePermission('USER_MANAGEMENT.edit'), asyncHandler(removeRoleFromUser));

export default router;
