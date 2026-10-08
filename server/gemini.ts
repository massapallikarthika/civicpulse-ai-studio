import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { SupabaseClient } from '@supabase/supabase-js';
import { getAdminSupabaseClient } from './supabase.js';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';

function getGeminiClient(): GoogleGenAI | null {
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface GeneratedInsight {
  type: 'recommendation' | 'alert' | 'performance';
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  recommendation: string;
}

export async function generateOperationalInsights(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  insights: GeneratedInsight[];
  message?: string;
  insufficientData?: boolean;
}> {
  // 1. Gather real records from Supabase for this officer
  let [
    { data: wards, error: wardsErr },
    { data: complaints, error: complaintsErr },
    { data: projects, error: projectsErr },
    { data: services, error: servicesErr },
    { data: resources, error: resourcesErr },
  ] = await Promise.all([
    supabase.from('wards').select('id, name, code, description').eq('user_id', userId),
    supabase.from('complaints').select('id, title, category, priority, status, responsible_department, ward_id').eq('user_id', userId),
    supabase.from('projects').select('id, name, department, budget, amount_spent, progress, status, planned_deadline, ward_id').eq('user_id', userId),
    supabase.from('services').select('id, service_type, coverage_percentage, satisfaction_percentage, status, reporting_period, ward_id').eq('user_id', userId),
    supabase.from('resources').select('id, department, allocation_name, allocated_amount, spent_amount, fiscal_year, currency').eq('user_id', userId),
  ]);

  if (wardsErr || complaintsErr || projectsErr || servicesErr || resourcesErr) {
    try {
      const adminClient = getAdminSupabaseClient();
      if (wardsErr) {
        const res = await adminClient.from('wards').select('id, name, code, description').eq('user_id', userId);
        if (res.data) wards = res.data;
      }
      if (complaintsErr) {
        const res = await adminClient.from('complaints').select('id, title, category, priority, status, responsible_department, ward_id').eq('user_id', userId);
        if (res.data) complaints = res.data;
      }
      if (projectsErr) {
        const res = await adminClient.from('projects').select('id, name, department, budget, amount_spent, progress, status, planned_deadline, ward_id').eq('user_id', userId);
        if (res.data) projects = res.data;
      }
      if (servicesErr) {
        const res = await adminClient.from('services').select('id, service_type, coverage_percentage, satisfaction_percentage, status, reporting_period, ward_id').eq('user_id', userId);
        if (res.data) services = res.data;
      }
      if (resourcesErr) {
        const res = await adminClient.from('resources').select('id, department, allocation_name, allocated_amount, spent_amount, fiscal_year, currency').eq('user_id', userId);
        if (res.data) resources = res.data;
      }
    } catch {
      // Ignore fallback failures
    }
  }

  const wardsList = wards || [];
  const complaintsList = complaints || [];
  const projectsList = projects || [];
  const servicesList = services || [];
  const resourcesList = resources || [];

  const totalRecords =
    wardsList.length +
    complaintsList.length +
    projectsList.length +
    servicesList.length +
    resourcesList.length;

  // Strict check: if there is insufficient data, do not invent fictional stats
  if (totalRecords < 2) {
    return {
      insights: [],
      insufficientData: true,
      message:
        'Not enough municipal records are available to generate a reliable insight. Please add at least a few complaints, wards, projects, services, or resource records first.',
    };
  }

  const aiClient = getGeminiClient();
  if (!aiClient) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Please ensure the Gemini API secret is provided in the server environment.'
    );
  }

  // Build clean, summarized factual context strictly from the officer's real records
  const contextSummary = {
    totalWards: wardsList.length,
    wards: wardsList.map((w) => ({ id: w.id, name: w.name, code: w.code, description: w.description })),
    complaintsSummary: {
      total: complaintsList.length,
      openOrInProgress: complaintsList.filter((c) => c.status !== 'Resolved' && c.status !== 'Closed').length,
      byPriority: {
        critical: complaintsList.filter((c) => c.priority === 'Critical').length,
        high: complaintsList.filter((c) => c.priority === 'High').length,
        medium: complaintsList.filter((c) => c.priority === 'Medium').length,
        low: complaintsList.filter((c) => c.priority === 'Low').length,
      },
      categories: complaintsList.map((c) => ({
        category: c.category,
        priority: c.priority,
        status: c.status,
        dept: c.responsible_department,
      })),
    },
    projectsSummary: {
      total: projectsList.length,
      active: projectsList.filter((p) => p.status === 'In Progress' || p.status === 'Planning').length,
      delayed: projectsList.filter((p) => p.status === 'Delayed').length,
      projects: projectsList.map((p) => ({
        name: p.name,
        department: p.department,
        budget: Number(p.budget),
        spent: Number(p.amount_spent),
        progress: Number(p.progress),
        status: p.status,
        deadline: p.planned_deadline,
      })),
    },
    servicesSummary: servicesList.map((s) => ({
      service: s.service_type,
      coveragePercent: Number(s.coverage_percentage),
      satisfactionPercent: Number(s.satisfaction_percentage),
      status: s.status,
    })),
    resourcesSummary: resourcesList.map((r) => ({
      department: r.department,
      allocation: r.allocation_name,
      allocated: Number(r.allocated_amount),
      spent: Number(r.spent_amount),
      currency: r.currency,
      fiscalYear: r.fiscal_year,
    })),
  };

  const systemInstruction = `You are an expert municipal governance operations analyst for CivicPulse, a local government resource dashboard.
Your job is to analyze ONLY the verified database records supplied by the municipal officer.
CRITICAL RULES:
1. Ground every finding directly in the real data provided in the prompt.
2. NEVER invent fake statistics, fictional ward names, or non-existent numbers.
3. Every insight MUST fall into one of three types: "recommendation", "alert", or "performance".
4. For "alert", identify immediate risks (e.g., critical open complaints, delayed projects, or depleted resource budgets).
5. For "performance", highlight service coverage bottlenecks, citizen satisfaction trends, or resource utilization efficiency.
6. For "recommendation", give actionable operational directives for municipal officers.
7. Always include the operational caveat that these insights are decision support and officers must verify with ground teams.`;

  const userPrompt = `Here is the current municipal operational data for this officer's jurisdiction:
${JSON.stringify(contextSummary, null, 2)}

Analyze this data and return between 2 and 5 actionable operational insights based strictly on these records.`;

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description: 'Must be one of: recommendation, alert, performance',
              },
              title: {
                type: Type.STRING,
                description: 'Clear, concise title of the insight',
              },
              description: {
                type: Type.STRING,
                description: 'Factual description grounded in the real records',
              },
              severity: {
                type: Type.STRING,
                description: 'Must be one of: Critical, High, Medium, Low, Informational',
              },
              recommendation: {
                type: Type.STRING,
                description: 'Actionable next step for municipal staff',
              },
            },
            required: ['type', 'title', 'description', 'severity', 'recommendation'],
          },
        },
      },
    });

    const text = response.text || '[]';
    let rawInsights: GeneratedInsight[] = [];
    try {
      rawInsights = JSON.parse(text);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON response:', parseErr, text);
      throw new Error('Gemini returned an invalid data format. Please try again.');
    }

    // Filter and sanitize insights
    const validInsights: GeneratedInsight[] = rawInsights.map((item) => ({
      type: ['recommendation', 'alert', 'performance'].includes(item.type)
        ? (item.type as 'recommendation' | 'alert' | 'performance')
        : 'recommendation',
      title: item.title || 'Operational Observation',
      description: item.description || '',
      severity: ['Critical', 'High', 'Medium', 'Low', 'Informational'].includes(item.severity)
        ? (item.severity as 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational')
        : 'Medium',
      recommendation: item.recommendation || 'Review ward operations and allocate resources accordingly.',
    }));

    // Record AI run in ai_runs table
    try {
      await supabase.from('ai_runs').insert({
        user_id: userId,
        input_context: contextSummary,
        output: { insightsCount: validInsights.length, insights: validInsights },
      });
    } catch (err) {
      console.warn('Could not record ai_run:', err);
    }

    // Save insights into ai_insights table
    if (validInsights.length > 0) {
      const inserts = validInsights.map((ins) => ({
        user_id: userId,
        type: ins.type,
        title: ins.title,
        description: ins.description,
        severity: ins.severity,
        recommendation: ins.recommendation,
        source_context: { timestamp: new Date().toISOString() },
      }));

      await supabase.from('ai_insights').insert(inserts);
    }

    return {
      insights: validInsights,
    };
  } catch (apiError: unknown) {
    const errorMsg = apiError instanceof Error ? apiError.message : 'Unknown Gemini error';
    console.error('Gemini API invocation error:', apiError);
    throw new Error(`Gemini Operational Insights error: ${errorMsg}`);
  }
}
