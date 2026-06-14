import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { personnelQueryKeys } from '../query-keys'
import { EmployeeCoreService } from '../services/employee-core-service'

type UseEmployeesQueryOptions = {
  enabled?: boolean
}

/**
 * 统一承接员工名册查询，避免 employees query 在 UI 层重复散落。
 */
export function useEmployeesQuery(options: UseEmployeesQueryOptions = {}) {
  const { enabled = true } = options
  const queryClient = useQueryClient()

  const employeesQuery = useQuery({
    queryKey: personnelQueryKeys.employees(),
    queryFn: () => EmployeeCoreService.getEmployees(),
    enabled,
  })

  const invalidateEmployees = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: personnelQueryKeys.employees(),
    })
  }, [queryClient])

  return {
    data: employeesQuery.data,
    error: employeesQuery.error,
    isLoading: employeesQuery.isLoading,
    isFetching: employeesQuery.isFetching,
    refetch: employeesQuery.refetch,
    invalidateEmployees,
  }
}
