import { NetlifyEvent, NetlifyResponse } from '../types/http';
import { supabase } from '../../database/supabase';
import {
  createErrorResponse,
  createSuccessResponse,
  getDataFromEvent,
  getFuntionNameFromEvent,
} from '../utils/server';
import {
  Survey,
  CreateSurveyRequest,
  UpdateSurveyRequest,
} from '../types/survey';

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const action = getFuntionNameFromEvent(event) as
      | 'getAll'
      | 'getById'
      | 'create'
      | 'update'
      | 'delete'
      | 'toggleActive';

    switch (action) {
      case 'getAll':
        return await handleGetAll(event);
      case 'getById':
        return await handleGetById(event);
      case 'create':
        return await handleCreate(event);
      case 'update':
        return await handleUpdate(event);
      case 'delete':
        return await handleDelete(event);
      case 'toggleActive':
        return await handleToggleActive(event);
      default:
        return createErrorResponse('无效的动作', 400);
    }
  } catch (error) {
    console.error('Survey function error:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleGetAll(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const requestData = getDataFromEvent(event);
    const { page = 1, pageSize = 10, isActive } = requestData;

    let query = supabase.from('surveys').select('*', { count: 'exact' });

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      console.error('Error getting surveys:', error);
      return createErrorResponse(error.message, 500);
    }

    // 获取每个问卷的问题
    const surveysWithQuestions = await Promise.all(
      (data || []).map(async (survey) => {
        const { data: questions, error: questionsError } = await supabase
          .from('survey_questions')
          .select('*')
          .eq('survey_id', survey.id)
          .order('sort_order', { ascending: true });

        if (questionsError) {
          console.error('Error getting survey questions:', questionsError);
          return survey;
        }

        return {
          ...survey,
          id: survey.id,
          title: survey.title,
          description: survey.description,
          questions: (questions || []).map((q) => ({
            id: q.id,
            type: q.type,
            title: q.title,
            description: q.description,
            required: q.required,
            options: q.options,
            maxRating: q.max_rating,
            placeholder: q.placeholder,
            sortOrder: q.sort_order,
          })),
          createdAt: survey.created_at,
          updatedAt: survey.updated_at,
          startDate: survey.start_date,
          endDate: survey.end_date,
          isActive: survey.is_active,
          allowMultipleSubmissions: survey.allow_multiple_submissions,
          createdBy: survey.created_by,
        };
      })
    );

    return createSuccessResponse({
      records: surveysWithQuestions,
      total: count || 0,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    console.error('Error in handleGetAll:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleGetById(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const requestData = getDataFromEvent(event);
    const { id } = requestData;

    if (!id) {
      return createErrorResponse('缺少问卷 ID', 400);
    }

    // 获取问卷基本信息
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', id)
      .single();

    if (surveyError) {
      console.error('Error getting survey:', surveyError);
      return createErrorResponse('问卷不存在', 404);
    }

    // 获取问卷问题
    const { data: questions, error: questionsError } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('survey_id', id)
      .order('sort_order', { ascending: true });

    if (questionsError) {
      console.error('Error getting survey questions:', questionsError);
      return createErrorResponse(questionsError.message, 500);
    }

    const surveyWithQuestions: Survey = {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      questions: (questions || []).map((q) => ({
        id: q.id,
        type: q.type,
        title: q.title,
        description: q.description,
        required: q.required,
        options: q.options,
        maxRating: q.max_rating,
        placeholder: q.placeholder,
        sortOrder: q.sort_order,
      })),
      createdAt: survey.created_at,
      updatedAt: survey.updated_at,
      startDate: survey.start_date,
      endDate: survey.end_date,
      isActive: survey.is_active,
      allowMultipleSubmissions: survey.allow_multiple_submissions,
      createdBy: survey.created_by,
    };

    return createSuccessResponse(surveyWithQuestions);
  } catch (error) {
    console.error('Error in handleGetById:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleCreate(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const requestData = getDataFromEvent(event);
    const {
      title,
      description,
      questions,
      startDate,
      endDate,
      isActive,
      allowMultipleSubmissions,
      createdBy,
    } = requestData as CreateSurveyRequest & { createdBy: string };

    if (!title || !questions || !Array.isArray(questions)) {
      return createErrorResponse('缺少必要参数', 400);
    }

    if (!createdBy) {
      return createErrorResponse('缺少创建者信息', 400);
    }

    // 开始事务
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .insert({
        title,
        description,
        created_by: createdBy,
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
        allow_multiple_submissions: allowMultipleSubmissions,
      })
      .select('id')
      .single();

    if (surveyError) {
      console.error('Error creating survey:', surveyError);
      return createErrorResponse(surveyError.message, 500);
    }

    // 创建问题
    const questionPromises = questions.map((question, index) => {
      return supabase.from('survey_questions').insert({
        survey_id: survey.id,
        type: question.type,
        title: question.title,
        description: question.description,
        required: question.required,
        options: question.options,
        max_rating: question.maxRating,
        placeholder: question.placeholder,
        sort_order: question.sortOrder || index,
      });
    });

    const questionResults = await Promise.all(questionPromises);
    const questionErrors = questionResults.filter((r) => r.error);

    if (questionErrors.length > 0) {
      console.error('Error creating questions:', questionErrors);
      // 回滚：删除已创建的问卷
      await supabase.from('surveys').delete().eq('id', survey.id);
      return createErrorResponse('创建问题失败', 500);
    }

    return createSuccessResponse({ id: survey.id, message: '问卷创建成功' });
  } catch (error) {
    console.error('Error in handleCreate:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleUpdate(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const requestData = getDataFromEvent(event);
    const {
      id,
      title,
      description,
      questions,
      startDate,
      endDate,
      isActive,
      allowMultipleSubmissions,
    } = requestData as UpdateSurveyRequest & { id: string };

    if (
      !id ||
      !title ||
      !questions ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return createErrorResponse('缺少必要参数', 400);
    }

    // 检查问卷是否存在
    const { data: existingSurvey, error: surveyError } = await supabase
      .from('surveys')
      .select('id')
      .eq('id', id)
      .single();

    if (surveyError) {
      console.error('Error finding survey:', surveyError);
      return createErrorResponse('问卷不存在', 404);
    }

    // 更新问卷基本信息
    const { error: updateError } = await supabase
      .from('surveys')
      .update({
        title,
        description,
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
        allow_multiple_submissions: allowMultipleSubmissions,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating survey:', updateError);
      return createErrorResponse(updateError.message, 500);
    }

    // 删除旧问题
    const { error: deleteError } = await supabase
      .from('survey_questions')
      .delete()
      .eq('survey_id', id);

    if (deleteError) {
      console.error('Error deleting old questions:', deleteError);
      return createErrorResponse(deleteError.message, 500);
    }

    // 创建新问题
    const questionPromises = questions.map((question, index) => {
      return supabase.from('survey_questions').insert({
        survey_id: id,
        type: question.type,
        title: question.title,
        description: question.description,
        required: question.required,
        options: question.options,
        max_rating: question.maxRating,
        placeholder: question.placeholder,
        sort_order: question.sortOrder || index,
      });
    });

    const questionResults = await Promise.all(questionPromises);
    const questionErrors = questionResults.filter((r) => r.error);

    if (questionErrors.length > 0) {
      console.error('Error creating new questions:', questionErrors);
      return createErrorResponse('更新问题失败', 500);
    }

    return createSuccessResponse({ id, message: '问卷更新成功' });
  } catch (error) {
    console.error('Error in handleUpdate:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleDelete(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const requestData = getDataFromEvent(event);
    const { id } = requestData;

    if (!id) {
      return createErrorResponse('缺少问卷 ID', 400);
    }

    // 检查问卷是否存在
    const { data: existingSurvey, error: surveyError } = await supabase
      .from('surveys')
      .select('id')
      .eq('id', id)
      .single();

    if (surveyError) {
      console.error('Error finding survey:', surveyError);
      return createErrorResponse('问卷不存在', 404);
    }

    // 删除问卷（级联删除问题和提交）
    const { error: deleteError } = await supabase
      .from('surveys')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting survey:', deleteError);
      return createErrorResponse(deleteError.message, 500);
    }

    return createSuccessResponse({ message: '问卷删除成功' });
  } catch (error) {
    console.error('Error in handleDelete:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleToggleActive(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  try {
    const requestData = getDataFromEvent(event);
    const { id } = requestData;

    if (!id) {
      return createErrorResponse('缺少问卷 ID', 400);
    }

    // 检查问卷是否存在
    const { data: existingSurvey, error: surveyError } = await supabase
      .from('surveys')
      .select('is_active')
      .eq('id', id)
      .single();

    if (surveyError) {
      console.error('Error finding survey:', surveyError);
      return createErrorResponse('问卷不存在', 404);
    }

    // 切换激活状态
    const newStatus = !existingSurvey.is_active;
    const { error: updateError } = await supabase
      .from('surveys')
      .update({ is_active: newStatus })
      .eq('id', id);

    if (updateError) {
      console.error('Error toggling survey status:', updateError);
      return createErrorResponse(updateError.message, 500);
    }

    return createSuccessResponse({
      id,
      isActive: newStatus,
      message: `问卷已${newStatus ? '激活' : '停用'}`,
    });
  } catch (error) {
    console.error('Error in handleToggleActive:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}
