import { useCallback, useEffect } from "react";
import {
  teamService,
  TeamMemberFilters,
  CreateTeamMemberData,
  UpdateTeamMemberData,
} from "../api";
import { usePaginatedApi, useMutation } from "./useApi";
import type {
  TeamMember,
  AccessLevel,
  Permission,
} from "../lib/collaboration-data";

export function useTeamMembers(initialFilters?: TeamMemberFilters) {
  const {
    items: members,
    pagination,
    isLoading,
    error,
    filters,
    fetchData,
    goToPage,
    updateFilters,
    refresh,
    updateItem,
    removeItem,
    addItem,
    setItems,
  } = usePaginatedApi<TeamMember, TeamMemberFilters>(
    (params) => teamService.getTeamMembers(params),
    { initialLimit: 50 }
  );

  // Fetch on mount
  useEffect(() => {
    fetchData(initialFilters);
  }, []);

  // Create member mutation
  const createMutation = useMutation<TeamMember, [CreateTeamMemberData]>(
    (data) => teamService.createTeamMember(data)
  );

  // Update member mutation
  const updateMutation = useMutation<
    TeamMember,
    [string, UpdateTeamMemberData]
  >((id, data) => teamService.updateTeamMember(id, data));

  // Delete member mutation
  const deleteMutation = useMutation<void, [string]>((id) =>
    teamService.deleteTeamMember(id)
  );

  // Role update mutation
  const roleMutation = useMutation<TeamMember, [string, TeamMember["role"]]>(
    (id, role) => teamService.updateMemberRole(id, role)
  );

  // Access level mutation
  const accessMutation = useMutation<TeamMember, [string, AccessLevel]>(
    (id, accessLevel) => teamService.updateAccessLevel(id, accessLevel)
  );

  // Permissions mutation
  const permissionsMutation = useMutation<TeamMember, [string, Permission[]]>(
    (id, permissions) => teamService.updateCustomPermissions(id, permissions)
  );

  const createMember = useCallback(
    async (data: CreateTeamMemberData) => {
      const result = await createMutation.mutate(data);
      if (result.success && result.data) {
        addItem(result.data);
      }
      return result;
    },
    [createMutation, addItem]
  );

  const updateMember = useCallback(
    async (id: string, data: UpdateTeamMemberData) => {
      const result = await updateMutation.mutate(id, data);
      if (result.success && result.data) {
        updateItem(id, result.data);
      }
      return result;
    },
    [updateMutation, updateItem]
  );

  const deleteMember = useCallback(
    async (id: string) => {
      const result = await deleteMutation.mutate(id);
      if (result.success) {
        removeItem(id);
      }
      return result;
    },
    [deleteMutation, removeItem]
  );

  const updateRole = useCallback(
    async (id: string, role: TeamMember["role"]) => {
      const result = await roleMutation.mutate(id, role);
      if (result.success && result.data) {
        updateItem(id, { role });
      }
      return result;
    },
    [roleMutation, updateItem]
  );

  const updateAccessLevel = useCallback(
    async (id: string, accessLevel: AccessLevel) => {
      const result = await accessMutation.mutate(id, accessLevel);
      if (result.success && result.data) {
        updateItem(id, { accessLevel });
      }
      return result;
    },
    [accessMutation, updateItem]
  );

  const updatePermissions = useCallback(
    async (id: string, permissions: Permission[]) => {
      const result = await permissionsMutation.mutate(id, permissions);
      if (result.success && result.data) {
        updateItem(id, { customPermissions: permissions });
      }
      return result;
    },
    [permissionsMutation, updateItem]
  );

  // Helper to get member by ID
  const getMemberById = useCallback(
    (id: string) => members.find((m) => m.id === id),
    [members]
  );

  // Helper to get online members
  const onlineMembers = members.filter((m) => m.isOnline);

  return {
    members,
    onlineMembers,
    pagination,
    isLoading,
    error,
    filters,
    // Actions
    fetchMembers: fetchData,
    goToPage,
    updateFilters,
    refresh,
    createMember,
    updateMember,
    deleteMember,
    updateRole,
    updateAccessLevel,
    updatePermissions,
    getMemberById,
    setMembers: setItems,
    // Mutation states
    isCreating: createMutation.isLoading,
    isUpdating: updateMutation.isLoading,
    isDeleting: deleteMutation.isLoading,
  };
}

export default useTeamMembers;
