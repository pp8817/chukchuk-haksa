import type { SupabaseClient } from '@supabase/supabase-js';
import type { Student } from '@/types/domain';
import type { Database } from '@/types/supabase';
import { createClient } from '../server';
import { DepartmentService } from './department-service';

export class StudentService {
  private readonly departmentService: DepartmentService;

  constructor(
    private readonly supabase: SupabaseClient<Database> = createClient(),
    departmentService?: DepartmentService
  ) {
    this.departmentService = departmentService || new DepartmentService(supabase);
  }

  private async getAuthenticatedUserId(): Promise<string> {
    const { data: userData, error } = await this.supabase.auth.getUser();

    if (error || !userData?.user) {
      throw new Error('User is not authenticated');
    }

    const userId = userData.user.id;

    if (!userId) {
      throw new Error('User is not authenticated');
    }

    return userId;
  }

  /**
   * 학생 정보를 초기화(Upsert)하고, student_id(= userId)를 반환
   */
  async initializeStudent(student: Student): Promise<string> {
    const userId = await this.getAuthenticatedUserId();

    // 1) 현재 사용자의 연동 상태 확인
    const { data: user } = await this.supabase.from('users').select('portal_connected').eq('id', userId).single();

    if (user?.portal_connected) {
      throw new Error('이미 포털 계정과 연동된 사용자입니다.');
    }

    // 2) 학과 department_id(FK) 설정
    const departmentPk = await this.departmentService.getOrCreateDepartment(
      student.departmentCode, // 크롤링된 학과 코드
      student.departmentName
    );

    // 3) 주전공 major_id(FK) 설정
    const majorPk = await this.departmentService.getOrCreateDepartment(
      student.majorCode, // 크롤링된 전공 코드
      student.majorName
    );

    // 4) 복수전공 secondary_major_id(FK) 설정 (선택사항)
    let secondaryMajorPk: number | null = null;
    if (student.secondaryMajorCode && student.secondaryMajorName) {
      secondaryMajorPk = await this.departmentService.getOrCreateDepartment(
        student.secondaryMajorCode,
        student.secondaryMajorName
      );
    }

    const { error } = await this.supabase.rpc('initialize_portal_connection', {
      p_user_id: userId,
      p_student_data: {
        ...student,
        department_id: departmentPk,
        major_id: majorPk,
        secondary_major_id: secondaryMajorPk,
      },
    });

    if (error) {
      console.error('Failed to initialize student record:', error);
      throw new Error('포털 연동에 실패했습니다.');
    }

    return userId; // student_id는 user_id와 동일
  }

  /**
   * 포털 연동 해제
   */
  async disconnectPortal(): Promise<void> {
    const userId = await this.getAuthenticatedUserId();

    const { error } = await this.supabase.rpc('disconnect_portal', {
      p_user_id: userId,
    });

    if (error) {
      throw new Error('포털 연동 해제에 실패했습니다.');
    }
  }

  /**
   * 연동 상태 확인
   */
  async getPortalConnectionStatus(): Promise<{
    isConnected: boolean;
    connectedAt?: string;
  }> {
    const userId = await this.getAuthenticatedUserId();

    const { data, error } = await this.supabase
      .from('users')
      .select('portal_connected, connected_at')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error('연동 상태 확인에 실패했습니다.');
    }

    return {
      isConnected: data.portal_connected || false,
      connectedAt: data.connected_at || undefined,
    };
  }

  /**
   * 학생의 목표 학점 업데이트
   */
  async updateTargetGpa(targetGpa: number): Promise<void> {
    const userId = await this.getAuthenticatedUserId();

    const { error } = await this.supabase.from('students').update({ target_gpa: targetGpa }).eq('student_id', userId);

    if (error) {
      console.error('Failed to update target gpa:', error);
      throw new Error('목표 학점 설정에 실패했습니다.');
    }
  }
}
