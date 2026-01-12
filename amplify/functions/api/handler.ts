import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
// @ts-ignore - aws-jwt-verifyの型定義が不足している場合があるため
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { decodeFromHttpHeader } from './japaneseEncoder';

/**
 * Cognito JWT Verifierの初期化
 * 注意: 環境変数COGNITO_USER_POOL_IDとCOGNITO_CLIENT_IDは
 * Amplifyが自動的に設定します（authリソースから取得）
 */
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  if (!verifier) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.COGNITO_CLIENT_ID;
    
    if (!userPoolId || !clientId) {
      throw new Error('COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set');
    }
    
    verifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'id',
      clientId,
    });
  }
  return verifier;
}

/**
 * パスパラメータを抽出するヘルパー関数
 */
function extractPathParams(path: string, pattern: string): Record<string, string> | null {
  const pathParts = path.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);
  
  if (pathParts.length !== patternParts.length) {
    return null;
  }
  
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      const paramName = patternParts[i].substring(1);
      params[paramName] = pathParts[i];
    } else if (pathParts[i] !== patternParts[i]) {
      return null;
    }
  }
  return params;
}

/**
 * HTTPヘッダーからX-Requested-Byを取得してデコードするヘルパー関数
 * 
 * 注意: フラグ不要版。常にBase64デコードを試みます。
 * 
 * @param headers - HTTPヘッダーオブジェクト
 * @returns デコードされたX-Requested-By値（存在しない場合はundefined）
 */
function getDecodedRequestedBy(headers: Record<string, string | undefined>): string | undefined {
  const requestedByRaw = headers['X-Requested-By'] || headers['x-requested-by'];
  if (!requestedByRaw) {
    return undefined;
  }
  
  // フラグ不要: 常にBase64デコードを試みる
  return decodeFromHttpHeader(requestedByRaw);
}

/**
 * クエリパラメータを取得するヘルパー関数
 */
function getQueryParams(event: APIGatewayProxyEvent): Record<string, string> {
  const params: Record<string, string> = {};
  if (event.queryStringParameters) {
    Object.assign(params, event.queryStringParameters);
  }
  if (event.multiValueQueryStringParameters) {
    Object.keys(event.multiValueQueryStringParameters).forEach(key => {
      const values = event.multiValueQueryStringParameters![key];
      if (values && values.length > 0) {
        params[key] = values[0];
      }
    });
  }
  return params;
}

/**
 * リクエストボディをパースするヘルパー関数
 */
function parseBody(event: APIGatewayProxyEvent): any {
  if (!event.body) {
    return null;
  }
  try {
    return JSON.parse(event.body);
  } catch (error) {
    return null;
  }
}

/**
 * 許可されたオリジンのリスト
 */
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://sys-a1int.work',
  'https://www.sys-a1int.work',
];

/**
 * 共通のCORSヘッダー
 * リクエスト元のオリジンを確認して、許可されたオリジンのみを返す
 * プロキシ統合では、Lambda関数がすべてのレスポンスでCORSヘッダーを返す必要がある
 */
function getCorsHeaders(event?: APIGatewayProxyEvent) {
  // デフォルトで開発環境のオリジンを許可
  let origin = 'http://localhost:5173';
  
  if (event && event.headers) {
    // リクエストヘッダーからオリジンを取得（大文字小文字を考慮）
    // API Gateway HTTP API v2では、ヘッダー名が小文字に変換される場合があるため、複数のパターンをチェック
    // HTTP API v2では、requestContext.http.sourceIpやrequestContext.domainNameも確認可能
    const requestOrigin = 
      event.headers.Origin || 
      event.headers.origin || 
      event.headers['Origin'] || 
      event.headers['origin'] ||
      // multiValueHeadersも確認（API Gateway v2 HTTP APIの場合）
      (event.multiValueHeaders && (event.multiValueHeaders.Origin?.[0] || event.multiValueHeaders.origin?.[0])) ||
      // HTTP API v2の場合、requestContextから取得を試みる
      ((event.requestContext as any)?.http?.sourceIp ? undefined : undefined); // HTTP API v2では直接取得できない
    
    console.log('🔍 CORS Headers Debug:', {
      hasEvent: !!event,
      hasHeaders: !!(event && event.headers),
      requestOrigin,
      allHeaders: event?.headers ? Object.keys(event.headers) : [],
      originHeader: event?.headers?.origin || event?.headers?.Origin || 'NOT FOUND',
      httpMethod: event?.httpMethod,
      path: event?.path
    });
    
    if (requestOrigin) {
      // 許可されたオリジンのリストに含まれているか確認
      if (ALLOWED_ORIGINS.includes(requestOrigin)) {
        origin = requestOrigin;
        console.log('✅ Origin matched allowed list:', origin);
      } else {
        console.warn(`⚠️ Origin not in allowed list: ${requestOrigin}. Using default: ${origin}`);
        // 許可されていないOriginでも、デフォルトのOriginを使用（開発環境）
        // 本番環境では、許可されたOriginのみを返すべき
      }
    } else {
      console.log('ℹ️ No Origin header found, using default origin:', origin);
      // OPTIONSリクエストの場合、Originヘッダーが存在しない場合でもデフォルトを使用
      if (event.httpMethod === 'OPTIONS') {
        console.log('OPTIONS request without Origin header, using default origin:', origin);
      }
    }
  } else {
    console.log('⚠️ No event or headers, using default origin:', origin);
  }
  
  // ヘッダーオブジェクトを明示的に作成（重複を防ぐ）
  const corsHeaders: Record<string, string> = {};
  
  // CORSヘッダーを1つずつ設定（重複を防ぐ）
  corsHeaders['Access-Control-Allow-Origin'] = origin;
  corsHeaders['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Request-Id,X-Device-Info,X-Requested-By,X-Employee-Id';
  corsHeaders['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
  corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  
  // OPTIONSリクエストの場合はContent-Typeを設定しない（空のボディを返すため）
  if (event?.httpMethod !== 'OPTIONS') {
    corsHeaders['Content-Type'] = 'application/json';
  }
  
  // デバッグ: 重複チェック
  const headerKeys = Object.keys(corsHeaders);
  const duplicateKeys = headerKeys.filter((key, index) => headerKeys.indexOf(key) !== index);
  if (duplicateKeys.length > 0) {
    console.error('❌ ERROR: Duplicate header keys found:', duplicateKeys);
  }
  
  console.log('✅ CORS Headers generated:', JSON.stringify(corsHeaders, null, 2));
  console.log('✅ CORS Headers count:', headerKeys.length);
  console.log('✅ Access-Control-Allow-Origin value:', corsHeaders['Access-Control-Allow-Origin']);
  
  return corsHeaders;
}

/**
 * 成功レスポンスを返すヘルパー関数
 */
function successResponse(data?: any, statusCode: number = 200, event?: APIGatewayProxyEvent): APIGatewayProxyResult {
  const response: any = {
    statusCode,
    message: '処理が正常に完了しました',
  };
  if (data !== undefined) {
    response.data = data;
  }
  const corsHeaders = getCorsHeaders(event);
  // デバッグ: CORSヘッダーが重複していないか確認
  console.log('🔍 successResponse - CORS headers:', JSON.stringify(corsHeaders, null, 2));
  console.log('🔍 successResponse - CORS headers keys:', Object.keys(corsHeaders));
  const accessControlOriginCount = Object.keys(corsHeaders).filter(k => k.toLowerCase() === 'access-control-allow-origin').length;
  if (accessControlOriginCount > 1) {
    console.error('❌ ERROR: Access-Control-Allow-Origin header is duplicated!', accessControlOriginCount);
  }
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(response),
  };
}

/**
 * エラーレスポンスを返すヘルパー関数
 */
function errorResponse(
  statusCode: number,
  errorCode: string,
  message: string,
  details?: any,
  event?: APIGatewayProxyEvent
): APIGatewayProxyResult {
  const response: any = {
    statusCode,
    message,
    error: {
      code: errorCode,
      message,
    },
  };
  if (details) {
    response.error.details = details;
  }
  const corsHeaders = getCorsHeaders(event);
  console.log(`⚠️ Error Response (${statusCode}):`, {
    errorCode,
    message,
    corsHeaders,
    origin: event?.headers?.origin || event?.headers?.Origin || 'not specified'
  });
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(response),
  };
}

/**
 * バリデーションエラーレスポンスを返すヘルパー関数
 * eventパラメータはオプション（渡されない場合はデフォルトのCORSヘッダーを使用）
 */
function validationErrorResponse(fieldErrors: Record<string, string[]>, event?: APIGatewayProxyEvent): APIGatewayProxyResult {
  return errorResponse(400, 'VALIDATION_ERROR', 'バリデーションエラーが発生しました', fieldErrors, event);
}

/**
 * 日付形式のバリデーション（YYYY-MM-DD）
 */
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * 日時形式のバリデーション（ISO 8601）
 */
function isValidDateTime(dateTimeString: string): boolean {
  const date = new Date(dateTimeString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * 現在時刻をISO 8601形式で取得
 */
function getCurrentDateTime(): string {
  return new Date().toISOString();
}

/**
 * 現在日をYYYY-MM-DD形式で取得
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * 日付文字列をDateオブジェクトに変換
 */
function parseDate(dateString: string): Date {
  return new Date(dateString + 'T00:00:00Z');
}

/**
 * 日付の比較（date1 <= date2）
 */
function isDateBeforeOrEqual(date1: string, date2: string): boolean {
  return parseDate(date1).getTime() <= parseDate(date2).getTime();
}

/**
 * 日数の計算（開始日と終了日を含む）
 */
function calculateDays(startDate: string, endDate: string): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // 開始日と終了日を含む
}

/**
 * API Gateway Lambda関数のハンドラー
 * すべてのAPIリクエストを処理
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('=== Lambda Handler Started ===');
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Request Method:', event.httpMethod);
  console.log('Request Path:', event.path);
  console.log('Request Path (rawPath):', (event as any).rawPath);
  console.log('Request Context:', JSON.stringify(event.requestContext, null, 2));
  console.log('Request Headers:', JSON.stringify(event.headers, null, 2));

  // OPTIONSリクエストの処理（CORS preflight）
  // 注意: OPTIONSリクエスト（CORSプリフライト）は認証を必要としないため、
  // 認証チェックをスキップしてCORSヘッダーのみを返す
  // backend.tsでcorsPreflight設定がある場合、OPTIONSリクエストはAPI Gatewayが自動的に処理するため、
  // このコードは実行されない可能性が高い（フォールバックとして残しておく）
  // 実際のリクエスト（GET/POSTなど）に対するCORSヘッダーは、Lambda関数が返す必要がある
  if (event.httpMethod === 'OPTIONS') {
    const corsHeaders = getCorsHeaders(event);
    console.log('=== OPTIONS Request (CORS Preflight) - No Authentication Required ===');
    console.log('Request path:', event.path);
    console.log('Request headers:', JSON.stringify(event.headers, null, 2));
    console.log('CORS headers to return:', JSON.stringify(corsHeaders, null, 2));
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // すべてのレスポンスでCORSヘッダーを含める（プロキシ統合の要件）
  const corsHeaders = getCorsHeaders(event);

  try {
    // 認証トークンの検証
    // 注意: OPTIONSリクエストは上記で処理されているため、ここには到達しません
    console.log('=== Authentication Check ===');
    console.log('Request headers:', JSON.stringify(event.headers, null, 2));
    console.log('Authorization header (direct):', event.headers.Authorization);
    console.log('Authorization header (lowercase):', event.headers.authorization);
    
    const authHeader = event.headers.Authorization || event.headers.authorization || event.headers['Authorization'] || event.headers['authorization'];
    console.log('Selected Authorization header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'NOT FOUND');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Authorization header is missing or invalid');
      console.error('Expected format: "Bearer <token>"');
      console.error('Received:', authHeader || 'null');
      console.error('Request Origin:', event.headers.origin || event.headers.Origin || 'not specified');
      console.error('Request Method:', event.httpMethod);
      console.error('Request Path:', event.path);
      const errorResult = errorResponse(401, 'UNAUTHORIZED', '認証トークンが無効です', undefined, event);
      console.log('401 Error Response:', JSON.stringify(errorResult, null, 2));
      return errorResult;
    }
    
    console.log('✅ Authorization header found');

    const token = authHeader.substring(7);
    console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
    
    let payload;
    try {
      const jwtVerifier = getVerifier();
      console.log('JWT Verifier created successfully');
      console.log('Verifying token...');
      payload = await jwtVerifier.verify(token);
      console.log('✅ Token verified successfully');
      console.log('Token payload:', JSON.stringify(payload, null, 2));
    } catch (error: any) {
      console.error('❌ Token verification failed:', error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      // 環境変数の確認
      console.log('COGNITO_USER_POOL_ID:', process.env.COGNITO_USER_POOL_ID ? 'SET' : 'NOT SET');
      console.log('COGNITO_CLIENT_ID:', process.env.COGNITO_CLIENT_ID ? 'SET' : 'NOT SET');
      console.error('Request Origin:', event.headers.origin || event.headers.Origin || 'not specified');
      const errorResult = errorResponse(401, 'UNAUTHORIZED', '認証トークンが無効です', undefined, event);
      console.log('401 Error Response (token verification failed):', JSON.stringify(errorResult, null, 2));
      return errorResult;
    }

    // メールアドレスを取得
    const email = String(payload.email || payload['cognito:username'] || '');

    // パスとメソッドに基づいてルーティング
    // API Gateway HTTP APIとREST APIで異なる可能性があるため、複数の方法で取得を試みる
    const path = (event as any).rawPath || event.path || ((event.requestContext as any)?.http?.path) || event.path || '';
    const method = ((event.requestContext as any)?.http?.method) || event.httpMethod;
    
    console.log('=== Routing Information ===');
    console.log('Extracted path:', path);
    console.log('Extracted method:', method);
    console.log('All path candidates:', {
      rawPath: (event as any).rawPath,
      path: event.path,
      httpPath: (event.requestContext as any)?.http?.path,
      resourcePath: (event.requestContext as any)?.resourcePath,
      pathParameters: event.pathParameters,
    });
    console.log('Email extracted from token:', email);

    // 認証認可API
    // API Gateway REST APIのプロキシ統合では、パスは`/api/v1/auth/authorize`の形式で渡される
    // ただし、`/{proxy+}`リソースを使用している場合、実際のパスが異なる可能性がある
    console.log('Checking route: /api/v1/auth/authorize');
    console.log('Path match check:', path === '/api/v1/auth/authorize', 'Method check:', method === 'GET');
    
    // パスの正規化（先頭のスラッシュを統一、末尾のスラッシュを削除）
    const normalizedPath = path.replace(/\/+$/, ''); // 末尾のスラッシュを削除
    
    if (normalizedPath === '/api/v1/auth/authorize' && method === 'GET') {
      console.log('✅ Route matched: /api/v1/auth/authorize (GET)');
      console.log('Calling handleGetAuthorization with email:', email);
      return await handleGetAuthorization(email, event);
    }
    
    // プロキシ統合の場合、パスに`/dev`などのステージプレフィックスが含まれる可能性がある
    // または、`/{proxy+}`リソースでは、実際のパスが`proxy`パラメータとして渡される可能性がある
    const proxyPath = event.pathParameters?.proxy;
    console.log('Proxy path parameter:', proxyPath);
    if (proxyPath && (proxyPath === 'api/v1/auth/authorize' || proxyPath.startsWith('api/v1/auth/authorize'))) {
      if (method === 'GET') {
        console.log('✅ Route matched via proxy parameter: api/v1/auth/authorize (GET)');
        console.log('Calling handleGetAuthorization with email:', email);
        return await handleGetAuthorization(email, event);
      }
    }
    
    // パスが`/dev/api/v1/auth/authorize`のような形式の場合
    // または、`api/v1/auth/authorize`が含まれている場合
    if (normalizedPath.includes('api/v1/auth/authorize') && method === 'GET') {
      console.log('✅ Route matched (contains): /api/v1/auth/authorize (GET)');
      console.log('Calling handleGetAuthorization with email:', email);
      return await handleGetAuthorization(email, event);
    }
    
    // パスが完全一致しない場合の詳細ログ
    console.log('⚠️ Route not matched for /api/v1/auth/authorize');
    console.log('Current path:', normalizedPath, 'Method:', method);
    console.log('All available paths and methods will be checked next...');
    if (path === '/api/v1/auth/refresh-authorization' && method === 'POST') {
      return await handleRefreshAuthorization(email, event);
    }

    // 従業員API
    if (path === '/api/v1/employees' && method === 'GET') {
      return await handleGetEmployees(email, getQueryParams(event), event);
    }
    if (path === '/api/v1/employees/register' && method === 'POST') {
      return await handleRegisterEmployee(email, parseBody(event), event.headers, event);
    }
    const employeeUpdateMatch = extractPathParams(path, '/api/v1/employees/:employeeId/update');
    if (employeeUpdateMatch && method === 'PUT') {
      return await handleUpdateEmployee(email, employeeUpdateMatch.employeeId as string, parseBody(event), event.headers, event);
    }

    // 勤怠API
    if (path === '/api/v1/attendance' && method === 'GET') {
      return await handleGetAttendanceLogs(email, getQueryParams(event), event);
    }
    if (path === '/api/v1/attendance/clock-in' && method === 'POST') {
      return await handleClockIn(email, parseBody(event), event);
    }
    if (path === '/api/v1/attendance/clock-out' && method === 'POST') {
      return await handleClockOut(email, parseBody(event), event);
    }
    if (path === '/api/v1/attendance/break/start' && method === 'POST') {
      return await handleStartBreak(email, parseBody(event), event);
    }
    if (path === '/api/v1/attendance/break/end' && method === 'POST') {
      return await handleEndBreak(email, parseBody(event), event);
    }
    if (path === '/api/v1/attendance/my-records' && method === 'GET') {
      return await handleGetMyRecords(email, getQueryParams(event), event);
    }
    const attendanceUpdateMatch = extractPathParams(path, '/api/v1/attendance/:attendanceId');
    if (attendanceUpdateMatch && method === 'PUT') {
      return await handleUpdateAttendance(email, attendanceUpdateMatch.attendanceId as string, parseBody(event), event);
    }
    if (path === '/api/v1/attendance/memo' && method === 'PATCH') {
      return await handleUpdateAttendanceMemo(email, parseBody(event), event);
    }

    // 手当マスタAPI
    if (path === '/api/v1/allowances' && method === 'GET') {
      return await handleGetAllowances(event);
    }
    if (path === '/api/v1/allowances' && method === 'POST') {
      return await handleCreateAllowance(email, parseBody(event), event);
    }
    const allowanceDetailMatch = extractPathParams(path, '/api/v1/allowances/:allowanceId');
    if (allowanceDetailMatch && method === 'GET') {
      return await handleGetAllowanceDetail(allowanceDetailMatch.allowanceId as string, event);
    }
    if (allowanceDetailMatch && method === 'PUT') {
      return await handleUpdateAllowance(email, allowanceDetailMatch.allowanceId as string, parseBody(event), event);
    }
    if (allowanceDetailMatch && method === 'DELETE') {
      return await handleDeleteAllowance(email, allowanceDetailMatch.allowanceId as string, event);
    }

    // 控除マスタAPI
    if (path === '/api/v1/deductions' && method === 'GET') {
      return await handleGetDeductions(event);
    }
    if (path === '/api/v1/deductions' && method === 'POST') {
      return await handleCreateDeduction(email, parseBody(event), event);
    }
    const deductionDetailMatch = extractPathParams(path, '/api/v1/deductions/:deductionId');
    if (deductionDetailMatch && method === 'GET') {
      return await handleGetDeductionDetail(deductionDetailMatch.deductionId as string, event);
    }
    if (deductionDetailMatch && method === 'PUT') {
      return await handleUpdateDeduction(email, deductionDetailMatch.deductionId as string, parseBody(event), event);
    }
    if (deductionDetailMatch && method === 'DELETE') {
      return await handleDeleteDeduction(email, deductionDetailMatch.deductionId as string, event);
    }

    // 休暇申請API
    if (path === '/api/v1/leave-requests' && method === 'GET') {
      return await handleGetLeaveRequests(email, getQueryParams(event), event);
    }
    if (path === '/api/v1/leave-requests' && method === 'POST') {
      return await handleCreateLeaveRequest(email, parseBody(event), event);
    }
    const leaveRequestDetailMatch = extractPathParams(path, '/api/v1/leave-requests/:requestId');
    if (leaveRequestDetailMatch && method === 'GET') {
      return await handleGetLeaveRequestDetail(email, leaveRequestDetailMatch.requestId as string, event);
    }
    if (leaveRequestDetailMatch && method === 'PUT') {
      return await handleUpdateLeaveRequest(email, leaveRequestDetailMatch.requestId as string, parseBody(event), event);
    }
    if (leaveRequestDetailMatch && method === 'DELETE') {
      return await handleDeleteLeaveRequest(email, leaveRequestDetailMatch.requestId as string, event);
    }
    const leaveRequestApproveMatch = extractPathParams(path, '/api/v1/leave-requests/:requestId/approve');
    if (leaveRequestApproveMatch && method === 'PATCH') {
      return await handleApproveLeaveRequest(email, leaveRequestApproveMatch.requestId as string, event);
    }
    const leaveRequestRejectMatch = extractPathParams(path, '/api/v1/leave-requests/:requestId/reject');
    if (leaveRequestRejectMatch && method === 'PATCH') {
      return await handleRejectLeaveRequest(email, leaveRequestRejectMatch.requestId as string, parseBody(event), event);
    }

    // 申請一覧API
    if (path === '/api/v1/applications' && method === 'GET') {
      return await handleGetApplications(email, getQueryParams(event), event);
    }
    if (path === '/api/v1/applications/status' && method === 'PATCH') {
      return await handleUpdateApplicationStatus(email, parseBody(event), event);
    }

    // 給与明細API
    if (path === '/api/v1/payroll' && method === 'GET') {
      return await handleGetPayrollList(email, getQueryParams(event), event);
    }
    if (path === '/api/v1/payroll' && method === 'POST') {
      return await handleCreatePayroll(email, parseBody(event), event.headers, event);
    }
    const payrollDetailMatch = extractPathParams(path, '/api/v1/payroll/:payrollId');
    if (payrollDetailMatch && method === 'GET') {
      return await handleGetPayrollDetail(email, payrollDetailMatch.payrollId as string, event);
    }
    if (payrollDetailMatch && method === 'PUT') {
      return await handleUpdatePayroll(email, payrollDetailMatch.payrollId as string, parseBody(event), event.headers, event);
    }
    const payrollMemoMatch = extractPathParams(path, '/api/v1/payroll/:payrollId/memo');
    if (payrollMemoMatch && method === 'PATCH') {
      return await handleUpdatePayrollMemo(email, payrollMemoMatch.payrollId as string, parseBody(event), event);
    }

    return errorResponse(404, 'NOT_FOUND', '指定されたエンドポイントが見つかりません', undefined, event);
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', 'サーバーエラーが発生しました', undefined, event);
  }
};

// ==================== 認証認可API ====================

/**
 * 従業員情報の型定義
 */
interface EmployeeInfo {
  employeeId: string;
  employeeName: string;
  email: string;
  role: 'admin' | 'employee';
  isActive: boolean;
  joinDate: string;
  leaveDate: string | null;
}

/**
 * 認可情報取得（内部関数）
 * 他のハンドラーから従業員情報を取得するために使用
 */
async function getEmployeeInfo(email: string): Promise<EmployeeInfo> {
  // TODO: RDSから従業員情報を取得
  // 1. メールアドレスで従業員を検索
  // 2. 在籍判定（入社日 <= 現在日 < 退職日）
  // 3. ロール判定（isAdminフラグから）

  // 暫定的な実装（実際の実装ではRDSから取得）
  const employee: EmployeeInfo = {
    employeeId: 'emp001',
    employeeName: 'テスト ユーザー',
    email: email,
    role: 'employee' as 'admin' | 'employee',
    isActive: true,
    joinDate: '2020-04-01',
    leaveDate: null,
  };

  return employee;
}

/**
 * 認可情報取得ハンドラー
 */
async function handleGetAuthorization(
  email: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const employee = await getEmployeeInfo(email);
    const response = successResponse(employee, 200, event);
    // デバッグ: 実際のレスポンスヘッダーをログに出力
    console.log('🔍 handleGetAuthorization - Response headers:', JSON.stringify(response.headers, null, 2));
    console.log('🔍 handleGetAuthorization - Response keys:', Object.keys(response.headers || {}));
    console.log('🔍 handleGetAuthorization - Access-Control-Allow-Origin count:', 
      Object.keys(response.headers || {}).filter(k => k.toLowerCase() === 'access-control-allow-origin').length);
    return response;
  } catch (error) {
    console.error('Error in handleGetAuthorization:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '認可情報の取得に失敗しました', undefined, event);
  }
}

/**
 * 認可情報更新ハンドラー（トークンリフレッシュ時）
 */
async function handleRefreshAuthorization(
  email: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  return await handleGetAuthorization(email, event);
}

// ==================== 従業員API ====================

/**
 * 従業員一覧取得ハンドラー
 */
async function handleGetEmployees(
  email: string,
  queryParams: Record<string, string>,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // TODO: 権限チェック（管理者のみ）
    // TODO: RDSから従業員一覧を取得
    // - employmentTypeでフィルタ
    // - activeOnlyでフィルタ
    // - searchで部分一致検索

    return successResponse({
      employees: [],
      total: 0,
    }, 200, event);
  } catch (error) {
    console.error('Error in handleGetEmployees:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '従業員一覧の取得に失敗しました', undefined, event);
  }
}

/**
 * 従業員登録ハンドラー
 */
async function handleRegisterEmployee(
  email: string,
  body: any,
  headers: Record<string, string | undefined>,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    await getEmployeeInfo(email);
    
    // X-Requested-Byヘッダーの取得（必須）
    const requestedBy = getDecodedRequestedBy(headers);
    if (!requestedBy) {
      return errorResponse(400, 'BAD_REQUEST', 'X-Requested-Byヘッダーは必須です', undefined, event);
    }
    
    // バリデーション
    if (!body) {
      return validationErrorResponse({ body: ['リクエストボディは必須です'] });
    }
    
    const {
      firstName,
      lastName,
      employmentType,
      email: employeeEmail,
      joinDate,
      leaveDate,
      allowances,
      isAdmin,
      baseSalary,
      paidLeaves,
      defaultBreakTime,
      prescribedWorkHours,
    } = body;
    
    const fieldErrors: Record<string, string[]> = {};
    
    if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
      fieldErrors.firstName = ['firstNameは必須です'];
    } else if (firstName.length > 50) {
      fieldErrors.firstName = ['firstNameは50文字以内で指定してください'];
    }
    
    if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
      fieldErrors.lastName = ['lastNameは必須です'];
    } else if (lastName.length > 50) {
      fieldErrors.lastName = ['lastNameは50文字以内で指定してください'];
    }
    
    if (!employmentType || typeof employmentType !== 'string') {
      fieldErrors.employmentType = ['employmentTypeは必須です'];
    } else {
      const validEmploymentTypes = ['FULL_TIME', 'PART_TIME'];
      if (!validEmploymentTypes.includes(employmentType)) {
        fieldErrors.employmentType = [`employmentTypeは${validEmploymentTypes.join(', ')}のいずれかを指定してください`];
      }
    }
    
    if (!employeeEmail || typeof employeeEmail !== 'string' || employeeEmail.trim().length === 0) {
      fieldErrors.email = ['emailは必須です'];
    } else {
      // メールアドレスの形式チェック
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(employeeEmail)) {
        fieldErrors.email = ['emailは有効なメールアドレス形式で指定してください'];
      }
    }
    
    if (!joinDate || typeof joinDate !== 'string') {
      fieldErrors.joinDate = ['joinDateは必須です（YYYY-MM-DD形式）'];
    } else if (!isValidDate(joinDate)) {
      fieldErrors.joinDate = ['joinDateはYYYY-MM-DD形式で指定してください'];
    }
    
    if (leaveDate !== undefined && leaveDate !== null) {
      if (typeof leaveDate !== 'string') {
        fieldErrors.leaveDate = ['leaveDateはYYYY-MM-DD形式で指定してください'];
      } else if (!isValidDate(leaveDate)) {
        fieldErrors.leaveDate = ['leaveDateはYYYY-MM-DD形式で指定してください'];
      } else if (joinDate && isValidDate(joinDate) && !isDateBeforeOrEqual(joinDate, leaveDate)) {
        fieldErrors.leaveDate = ['leaveDateはjoinDate以降の日付を指定してください'];
      }
    }
    
    if (allowances !== undefined && !Array.isArray(allowances)) {
      fieldErrors.allowances = ['allowancesは配列で指定してください'];
    }
    
    if (isAdmin !== undefined && typeof isAdmin !== 'boolean') {
      fieldErrors.isAdmin = ['isAdminはboolean型で指定してください'];
    }
    
    if (baseSalary === undefined || baseSalary === null || typeof baseSalary !== 'number' || baseSalary < 0) {
      fieldErrors.baseSalary = ['baseSalaryは0以上の数値で指定してください'];
    }
    
    if (paidLeaves !== undefined && !Array.isArray(paidLeaves)) {
      fieldErrors.paidLeaves = ['paidLeavesは配列で指定してください'];
    } else if (Array.isArray(paidLeaves)) {
      paidLeaves.forEach((paidLeave: any, index: number) => {
        if (!paidLeave.grantDate || !isValidDate(paidLeave.grantDate)) {
          fieldErrors[`paidLeaves[${index}].grantDate`] = ['grantDateは必須です（YYYY-MM-DD形式）'];
        }
        if (paidLeave.days === undefined || paidLeave.days === null || typeof paidLeave.days !== 'number' || paidLeave.days <= 0) {
          fieldErrors[`paidLeaves[${index}].days`] = ['daysは正の数値で指定してください'];
        }
      });
    }
    
    if (defaultBreakTime !== undefined && defaultBreakTime !== null) {
      if (typeof defaultBreakTime !== 'number') {
        fieldErrors.defaultBreakTime = ['defaultBreakTimeは数値で指定してください'];
      } else {
        const validBreakTimes = [30, 60, 90];
        if (!validBreakTimes.includes(defaultBreakTime)) {
          fieldErrors.defaultBreakTime = [`defaultBreakTimeは${validBreakTimes.join(', ')}のいずれかを指定してください`];
        }
      }
    }
    
    if (prescribedWorkHours !== undefined && prescribedWorkHours !== null && typeof prescribedWorkHours !== 'number') {
      fieldErrors.prescribedWorkHours = ['prescribedWorkHoursは数値で指定してください'];
    }
    
    if (Object.keys(fieldErrors).length > 0) {
      return validationErrorResponse(fieldErrors);
    }
    
    // TODO: メールアドレスの重複チェック
    // const existingEmployee = await getEmployeeByEmail(employeeEmail);
    // if (existingEmployee) {
    //   return errorResponse(409, 'CONFLICT', '同じメールアドレスの従業員が既に存在します');
    // }
    
    // TODO: 手当マスタの存在確認
    // if (allowances && allowances.length > 0) {
    //   for (const allowanceId of allowances) {
    //     const allowance = await getAllowance(allowanceId);
    //     if (!allowance) {
    //       return errorResponse(404, 'NOT_FOUND', `指定された手当マスタが見つかりません（ID: ${allowanceId}）`);
    //     }
    //   }
    // }
    
    // TODO: RDSに従業員を登録（トランザクション管理）
    // - 従業員テーブルに登録
    // - 手当の紐づけ（t_employee_allowance）
    // - 有給付与台帳への登録（t_paid_leave_grant_ledger）
    // - defaultBreakTimeのデフォルト値は90分
    // - requestedByをupdatedByに保存

    return successResponse(undefined, 201);
  } catch (error) {
    console.error('Error in handleRegisterEmployee:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '従業員の登録に失敗しました', undefined, event);
  }
}

/**
 * 従業員更新ハンドラー
 */
async function handleUpdateEmployee(
  email: string,
  employeeId: string,
  body: any,
  headers: Record<string, string | undefined>,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    await getEmployeeInfo(email);
    
    // X-Requested-Byヘッダーの取得（必須）
    const requestedBy = getDecodedRequestedBy(headers);
    if (!requestedBy) {
      return errorResponse(400, 'BAD_REQUEST', 'X-Requested-Byヘッダーは必須です', undefined, event);
    }
    
    // TODO: RDSから従業員を取得
    // const employee = await getEmployee(employeeId);
    // if (!employee) {
    //   return errorResponse(404, 'NOT_FOUND', '指定された従業員が見つかりません');
    // }
    
    // バリデーション（登録時と同じ）
    if (!body) {
      return validationErrorResponse({ body: ['リクエストボディは必須です'] });
    }
    
    const {
      firstName,
      lastName,
      employmentType,
      email: employeeEmail,
      joinDate,
      leaveDate,
      allowances,
      isAdmin,
      baseSalary,
      paidLeaves,
      defaultBreakTime,
      prescribedWorkHours,
    } = body;
    
    const fieldErrors: Record<string, string[]> = {};
    
    if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
      fieldErrors.firstName = ['firstNameは必須です'];
    } else if (firstName.length > 50) {
      fieldErrors.firstName = ['firstNameは50文字以内で指定してください'];
    }
    
    if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
      fieldErrors.lastName = ['lastNameは必須です'];
    } else if (lastName.length > 50) {
      fieldErrors.lastName = ['lastNameは50文字以内で指定してください'];
    }
    
    if (!employmentType || typeof employmentType !== 'string') {
      fieldErrors.employmentType = ['employmentTypeは必須です'];
    } else {
      const validEmploymentTypes = ['FULL_TIME', 'PART_TIME'];
      if (!validEmploymentTypes.includes(employmentType)) {
        fieldErrors.employmentType = [`employmentTypeは${validEmploymentTypes.join(', ')}のいずれかを指定してください`];
      }
    }
    
    if (!employeeEmail || typeof employeeEmail !== 'string' || employeeEmail.trim().length === 0) {
      fieldErrors.email = ['emailは必須です'];
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(employeeEmail)) {
        fieldErrors.email = ['emailは有効なメールアドレス形式で指定してください'];
      }
    }
    
    if (!joinDate || typeof joinDate !== 'string') {
      fieldErrors.joinDate = ['joinDateは必須です（YYYY-MM-DD形式）'];
    } else if (!isValidDate(joinDate)) {
      fieldErrors.joinDate = ['joinDateはYYYY-MM-DD形式で指定してください'];
    }
    
    if (leaveDate !== undefined && leaveDate !== null) {
      if (typeof leaveDate !== 'string') {
        fieldErrors.leaveDate = ['leaveDateはYYYY-MM-DD形式で指定してください'];
      } else if (!isValidDate(leaveDate)) {
        fieldErrors.leaveDate = ['leaveDateはYYYY-MM-DD形式で指定してください'];
      } else if (joinDate && isValidDate(joinDate) && !isDateBeforeOrEqual(joinDate, leaveDate)) {
        fieldErrors.leaveDate = ['leaveDateはjoinDate以降の日付を指定してください'];
      }
    }
    
    if (allowances !== undefined && !Array.isArray(allowances)) {
      fieldErrors.allowances = ['allowancesは配列で指定してください'];
    }
    
    if (isAdmin !== undefined && typeof isAdmin !== 'boolean') {
      fieldErrors.isAdmin = ['isAdminはboolean型で指定してください'];
    }
    
    if (baseSalary === undefined || baseSalary === null || typeof baseSalary !== 'number' || baseSalary < 0) {
      fieldErrors.baseSalary = ['baseSalaryは0以上の数値で指定してください'];
    }
    
    if (paidLeaves !== undefined && !Array.isArray(paidLeaves)) {
      fieldErrors.paidLeaves = ['paidLeavesは配列で指定してください'];
    } else if (Array.isArray(paidLeaves)) {
      paidLeaves.forEach((paidLeave: any, index: number) => {
        if (!paidLeave.grantDate || !isValidDate(paidLeave.grantDate)) {
          fieldErrors[`paidLeaves[${index}].grantDate`] = ['grantDateは必須です（YYYY-MM-DD形式）'];
        }
        if (paidLeave.days === undefined || paidLeave.days === null || typeof paidLeave.days !== 'number' || paidLeave.days <= 0) {
          fieldErrors[`paidLeaves[${index}].days`] = ['daysは正の数値で指定してください'];
        }
      });
    }
    
    if (defaultBreakTime !== undefined && defaultBreakTime !== null) {
      if (typeof defaultBreakTime !== 'number') {
        fieldErrors.defaultBreakTime = ['defaultBreakTimeは数値で指定してください'];
      } else {
        const validBreakTimes = [30, 60, 90];
        if (!validBreakTimes.includes(defaultBreakTime)) {
          fieldErrors.defaultBreakTime = [`defaultBreakTimeは${validBreakTimes.join(', ')}のいずれかを指定してください`];
        }
      }
    }
    
    if (prescribedWorkHours !== undefined && prescribedWorkHours !== null && typeof prescribedWorkHours !== 'number') {
      fieldErrors.prescribedWorkHours = ['prescribedWorkHoursは数値で指定してください'];
    }
    
    if (Object.keys(fieldErrors).length > 0) {
      return validationErrorResponse(fieldErrors);
    }
    
    // TODO: メールアドレスの重複チェック（自分以外）
    // if (employeeEmail !== employee.email) {
    //   const existingEmployee = await getEmployeeByEmail(employeeEmail);
    //   if (existingEmployee && existingEmployee.employeeId !== employeeId) {
    //     return errorResponse(409, 'CONFLICT', '同じメールアドレスの従業員が既に存在します');
    //   }
    // }
    
    // TODO: 手当マスタの存在確認
    // if (allowances && allowances.length > 0) {
    //   for (const allowanceId of allowances) {
    //     const allowance = await getAllowance(allowanceId);
    //     if (!allowance) {
    //       return errorResponse(404, 'NOT_FOUND', `指定された手当マスタが見つかりません（ID: ${allowanceId}）`);
    //     }
    //   }
    // }
    
    // TODO: RDSで従業員情報を更新
    // - 手当の紐づけを更新（既存を削除して新規作成）
    // - requestedByをupdatedByに保存

    return successResponse();
  } catch (error) {
    console.error('Error in handleUpdateEmployee:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '従業員の更新に失敗しました', undefined, event);
  }
}

// ==================== 勤怠API ====================

/**
 * 勤怠記録一覧取得ハンドラー
 */
async function handleGetAttendanceLogs(
  email: string,
  queryParams: Record<string, string>,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // TODO: 権限チェック（管理者のみ）
    // TODO: RDSから勤怠記録一覧を取得
    // - startDate, endDateでフィルタ
    // - 従業員情報、残業時間、深夜時間、メモ情報も含めて取得

    return successResponse({
      logs: [],
      total: 0,
    }, 200, event);
  } catch (error) {
    console.error('Error in handleGetAttendanceLogs:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '勤怠記録一覧の取得に失敗しました', undefined, event);
  }
}

/**
 * 出勤打刻ハンドラー
 */
async function handleClockIn(
  email: string,
  body: any,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    const employeeInfo = await getEmployeeInfo(email);
    
    // バリデーション
    if (!body) {
      return validationErrorResponse({ date: ['dateは必須です'] }, event);
    }
    
    const { date } = body;
    if (!date || typeof date !== 'string') {
      return validationErrorResponse({ date: ['dateは必須です（YYYY-MM-DD形式）'] }, event);
    }
    
    if (!isValidDate(date)) {
      return validationErrorResponse({ date: ['dateはYYYY-MM-DD形式で指定してください'] }, event);
    }
    
    // TODO: RDSから指定日付の勤怠記録を取得
    // const attendanceRecord = await getAttendanceRecord(employeeInfo.employeeId, date);
    
    // 既に出勤打刻済みの場合はエラー
    // if (attendanceRecord && attendanceRecord.clockInTime) {
    //   return errorResponse(409, 'CONFLICT', '既に出勤打刻済みです');
    // }
    
    // 打刻時刻はサーバー側で現在時刻を使用
    const clockInTime = getCurrentDateTime();
    
    // TODO: RDSに出勤打刻を記録
    // - 指定日付の勤怠記録が存在しない場合は作成
    // - 存在する場合は更新
    // - ステータスを「working」（出勤中）に更新
    
    // 暫定的なレスポンス
    const response = {
      attendanceId: 'att001',
      employeeId: employeeInfo.employeeId,
      employeeName: employeeInfo.employeeName,
      workDate: date,
      clockIn: clockInTime,
      clockOut: null,
      breaks: [],
      status: 'working',
      overtimeMinutes: 0,
      lateNightMinutes: 0,
      memo: null,
      updatedBy: null,
      updatedAt: clockInTime,
    };

    return successResponse(response, 201, event);
  } catch (error) {
    console.error('Error in handleClockIn:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '出勤打刻に失敗しました', undefined, event);
  }
}

/**
 * 退勤打刻ハンドラー
 */
async function handleClockOut(
  email: string,
  body: any,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    const employeeInfo = await getEmployeeInfo(email);
    
    // バリデーション
    if (!body) {
      return validationErrorResponse({ date: ['dateは必須です'] }, event);
    }
    
    const { date } = body;
    if (!date || typeof date !== 'string') {
      return validationErrorResponse({ date: ['dateは必須です（YYYY-MM-DD形式）'] }, event);
    }
    
    if (!isValidDate(date)) {
      return validationErrorResponse({ date: ['dateはYYYY-MM-DD形式で指定してください'] }, event);
    }
    
    // TODO: RDSから指定日付の勤怠記録を取得
    // const attendanceRecord = await getAttendanceRecord(employeeInfo.employeeId, date);
    
    // 出勤打刻がされていない場合はエラー
    // if (!attendanceRecord || !attendanceRecord.clockInTime) {
    //   return errorResponse(400, 'BAD_REQUEST', '出勤打刻がされていません');
    // }
    
    // 既に退勤打刻済みの場合はエラー
    // if (attendanceRecord.clockOutTime) {
    //   return errorResponse(409, 'CONFLICT', '既に退勤打刻済みです');
    // }
    
    // 退勤時刻はサーバー側で現在時刻を使用
    const clockOutTime = getCurrentDateTime();
    
    // TODO: 休憩記録が存在しない場合、defaultBreakTimeに基づいて自動的に休憩記録を作成
    // - null → 処理なし
    // - 30分 → 15:00-15:30に休憩
    // - 60分 → 12:00-13:00に休憩
    // - 90分 → 12:00-13:00/15:00-15:30に休憩
    
    // TODO: 休憩中に退勤した場合の処理
    // - breakEndTimeがnullの休憩記録がある場合、退勤時刻をbreakEndTimeに自動設定
    
    // TODO: 総労働時間を自動計算
    // - totalWorkMinutes = (clockOutTime - clockInTime) - totalBreakMinutes
    // - 負の値にならないように補正
    
    // TODO: RDSに退勤打刻を記録
    // - ステータスを「completed」（退勤済み）に更新
    
    // 暫定的なレスポンス
    const response = {
      attendanceId: 'att001',
      employeeId: employeeInfo.employeeId,
      employeeName: employeeInfo.employeeName,
      workDate: date,
      clockIn: '2024-01-15T09:00:00Z', // TODO: 実際の出勤時刻
      clockOut: clockOutTime,
      breaks: [],
      status: 'completed',
      overtimeMinutes: 0,
      lateNightMinutes: 0,
      memo: null,
      updatedBy: null,
      updatedAt: clockOutTime,
    };

    return successResponse(response, 200, event);
  } catch (error) {
    console.error('Error in handleClockOut:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '退勤打刻に失敗しました', undefined, event);
  }
}

/**
 * 休憩開始ハンドラー
 */
async function handleStartBreak(
  email: string,
  body: any,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    const employeeInfo = await getEmployeeInfo(email);
    
    // バリデーション
    if (!body) {
      return validationErrorResponse({ date: ['dateは必須です'] });
    }
    
    const { date } = body;
    if (!date || typeof date !== 'string') {
      return validationErrorResponse({ date: ['dateは必須です（YYYY-MM-DD形式）'] });
    }
    
    if (!isValidDate(date)) {
      return validationErrorResponse({ date: ['dateはYYYY-MM-DD形式で指定してください'] });
    }
    
    // TODO: RDSから指定日付の勤怠記録を取得
    // const attendanceRecord = await getAttendanceRecord(employeeInfo.employeeId, date);
    
    // 出勤打刻がされていない場合はエラー
    // if (!attendanceRecord || !attendanceRecord.clockInTime) {
    //   return errorResponse(400, 'BAD_REQUEST', '出勤打刻がされていません');
    // }
    
    // 退勤済みの場合はエラー
    // if (attendanceRecord.status === 'completed') {
    //   return errorResponse(400, 'BAD_REQUEST', '退勤済みのため休憩開始できません');
    // }
    
    // 休憩開始時刻はサーバー側で現在時刻を使用
    const breakStartTime = getCurrentDateTime();
    
    // TODO: RDSに休憩記録を作成
    // - ステータスを「on_break」（休憩中）に更新
    
    // 暫定的なレスポンス
    const response = {
      attendanceId: 'att001',
      employeeId: employeeInfo.employeeId,
      employeeName: employeeInfo.employeeName,
      workDate: date,
      clockIn: '2024-01-15T09:00:00Z', // TODO: 実際の出勤時刻
      clockOut: null,
      breaks: [
        {
          breakId: 'break001',
          start: breakStartTime,
          end: null,
        },
      ],
      status: 'on_break',
      overtimeMinutes: 0,
      lateNightMinutes: 0,
      memo: null,
      updatedBy: null,
      updatedAt: breakStartTime,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Error in handleStartBreak:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '休憩開始に失敗しました', undefined, event);
  }
}

/**
 * 休憩終了ハンドラー
 */
async function handleEndBreak(
  email: string,
  body: any,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    const employeeInfo = await getEmployeeInfo(email);
    
    // バリデーション
    if (!body) {
      return validationErrorResponse({ date: ['dateは必須です'] });
    }
    
    const { date } = body;
    if (!date || typeof date !== 'string') {
      return validationErrorResponse({ date: ['dateは必須です（YYYY-MM-DD形式）'] });
    }
    
    if (!isValidDate(date)) {
      return validationErrorResponse({ date: ['dateはYYYY-MM-DD形式で指定してください'] });
    }
    
    // TODO: RDSから指定日付の勤怠記録と休憩記録を取得
    // const attendanceRecord = await getAttendanceRecord(employeeInfo.employeeId, date);
    // const activeBreakRecord = await getActiveBreakRecord(attendanceRecord.attendanceId);
    
    // 休憩記録が存在しない場合はエラー
    // if (!activeBreakRecord) {
    //   return errorResponse(400, 'BAD_REQUEST', '休憩記録が存在しません');
    // }
    
    // 既に休憩終了済みの場合はエラー
    // if (activeBreakRecord.breakEndTime) {
    //   return errorResponse(409, 'CONFLICT', '既に休憩終了済みです');
    // }
    
    // 休憩終了時刻はサーバー側で現在時刻を使用
    const breakEndTime = getCurrentDateTime();
    
    // TODO: RDSで休憩記録を更新
    // - 最新の未終了の休憩記録を終了
    // - 休憩時間を自動計算
    // - 退勤済みの場合はステータスを更新しない（workingのまま）
    // - 退勤済みでない場合はステータスを「working」（出勤中）に更新
    
    // 暫定的なレスポンス
    const response = {
      attendanceId: 'att001',
      employeeId: employeeInfo.employeeId,
      employeeName: employeeInfo.employeeName,
      workDate: date,
      clockIn: '2024-01-15T09:00:00Z', // TODO: 実際の出勤時刻
      clockOut: null,
      breaks: [
        {
          breakId: 'break001',
          start: '2024-01-15T12:00:00Z', // TODO: 実際の休憩開始時刻
          end: breakEndTime,
        },
      ],
      status: 'working',
      overtimeMinutes: 0,
      lateNightMinutes: 0,
      memo: null,
      updatedBy: null,
      updatedAt: breakEndTime,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Error in handleEndBreak:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '休憩終了に失敗しました', undefined, event);
  }
}

/**
 * 出勤簿一覧取得ハンドラー
 */
async function handleGetMyRecords(
  email: string,
  queryParams: Record<string, string>,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // TODO: 従業員IDを取得（emailから）
    // TODO: employeeIdクエリパラメータが指定された場合、管理者のみその従業員IDの記録を取得可能
    // TODO: RDSから勤怠記録を取得
    // - 指定された年月の勤怠記録を取得
    // - サマリー情報を計算（実労働時間、実残業時間、実働日数、有給残日数など）
    // - logs配列からemployeeId、employeeName、memo、updatedBy、updatedAtを除外

    return successResponse({
      summary: {},
      logs: [],
      total: 0,
    });
  } catch (error) {
    console.error('Error in handleGetMyRecords:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '出勤簿一覧の取得に失敗しました', undefined, event);
  }
}

/**
 * 勤怠記録更新ハンドラー
 */
async function handleUpdateAttendance(
  email: string,
  attendanceId: string,
  body: any,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    const employeeInfo = await getEmployeeInfo(email);
    
    // TODO: RDSから勤怠記録を取得
    // const attendanceRecord = await getAttendanceRecordById(attendanceId);
    // if (!attendanceRecord) {
    //   return errorResponse(404, 'NOT_FOUND', '指定された勤怠記録が見つかりません');
    // }
    
    // 権限チェック（従業員は自分の記録のみ、管理者は全記録）
    // if (employeeInfo.role !== 'admin' && attendanceRecord.employeeId !== employeeInfo.employeeId) {
    //   return errorResponse(403, 'FORBIDDEN', '他の従業員の勤怠記録を更新する権限がありません');
    // }
    
    // バリデーション
    if (!body) {
      return validationErrorResponse({ body: ['リクエストボディは必須です'] });
    }
    
    const { clockIn, clockOut, breaks } = body;
    const fieldErrors: Record<string, string[]> = {};
    
    if (clockIn !== undefined && clockIn !== null) {
      if (typeof clockIn !== 'string') {
        fieldErrors.clockIn = ['clockInは文字列またはnullで指定してください'];
      } else if (!isValidDateTime(clockIn)) {
        fieldErrors.clockIn = ['clockInはISO 8601形式で指定してください'];
      }
    }
    
    if (clockOut !== undefined && clockOut !== null) {
      if (typeof clockOut !== 'string') {
        fieldErrors.clockOut = ['clockOutは文字列またはnullで指定してください'];
      } else if (!isValidDateTime(clockOut)) {
        fieldErrors.clockOut = ['clockOutはISO 8601形式で指定してください'];
      }
    }
    
    if (clockIn && clockOut && isValidDateTime(clockIn) && isValidDateTime(clockOut)) {
      const clockInTime = new Date(clockIn);
      const clockOutTime = new Date(clockOut);
      if (clockOutTime.getTime() <= clockInTime.getTime()) {
        fieldErrors.clockOut = ['clockOutはclockInより後の時刻を指定してください'];
      }
    }
    
    if (breaks !== undefined && !Array.isArray(breaks)) {
      fieldErrors.breaks = ['breaksは配列で指定してください'];
    } else if (Array.isArray(breaks)) {
      breaks.forEach((breakRecord: any, index: number) => {
        if (!breakRecord.start || typeof breakRecord.start !== 'string' || !isValidDateTime(breakRecord.start)) {
          fieldErrors[`breaks[${index}].start`] = ['startは必須です（ISO 8601形式）'];
        }
        if (breakRecord.end !== undefined && breakRecord.end !== null) {
          if (typeof breakRecord.end !== 'string') {
            fieldErrors[`breaks[${index}].end`] = ['endは文字列またはnullで指定してください'];
          } else if (!isValidDateTime(breakRecord.end)) {
            fieldErrors[`breaks[${index}].end`] = ['endはISO 8601形式で指定してください'];
          } else if (breakRecord.start && isValidDateTime(breakRecord.start)) {
            const startTime = new Date(breakRecord.start);
            const endTime = new Date(breakRecord.end);
            if (endTime.getTime() <= startTime.getTime()) {
              fieldErrors[`breaks[${index}].end`] = ['endはstartより後の時刻を指定してください'];
            }
          }
        }
      });
    }
    
    if (Object.keys(fieldErrors).length > 0) {
      return validationErrorResponse(fieldErrors);
    }
    
    // TODO: RDSで勤怠記録を更新
    // - 出勤時刻、退勤時刻を更新
    // - breaks配列が指定された場合、既存の休憩記録を論理削除（isActive=false）して新規作成（isActive=true）
    // - breaksが空配列[]の場合は、すべての休憩記録を論理削除
    // - breaksが指定されない場合は、既存の休憩記録はそのまま保持
    // - 出勤時刻と退勤時刻に応じてステータスを自動更新
    // - 総労働時間を再計算

    return successResponse();
  } catch (error) {
    console.error('Error in handleUpdateAttendance:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '勤怠記録の更新に失敗しました', undefined, event);
  }
}

/**
 * 勤怠記録メモ更新ハンドラー
 */
async function handleUpdateAttendanceMemo(
  email: string,
  body: any,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    await getEmployeeInfo(email);
    
    // バリデーション
    if (!body) {
      return validationErrorResponse({ body: ['リクエストボディは必須です'] });
    }
    
    const { attendanceId, memo } = body;
    const fieldErrors: Record<string, string[]> = {};
    
    if (!attendanceId || typeof attendanceId !== 'string') {
      fieldErrors.attendanceId = ['attendanceIdは必須です'];
    }
    
    if (memo !== undefined && memo !== null && typeof memo !== 'string') {
      fieldErrors.memo = ['memoは文字列またはnullで指定してください'];
    }
    
    if (Object.keys(fieldErrors).length > 0) {
      return validationErrorResponse(fieldErrors);
    }
    
    // TODO: RDSから勤怠記録を取得
    // const attendanceRecord = await getAttendanceRecordById(attendanceId);
    // if (!attendanceRecord) {
    //   return errorResponse(404, 'NOT_FOUND', '指定された勤怠記録が見つかりません');
    // }
    
    // TODO: RDSで勤怠記録のメモを更新
    // - memoにnullを指定するとメモを削除

    return successResponse();
  } catch (error) {
    console.error('Error in handleUpdateAttendanceMemo:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '勤怠記録メモの更新に失敗しました', undefined, event);
  }
}

// ==================== 手当マスタAPI ====================

/**
 * 手当マスタ一覧取得ハンドラー
 */
async function handleGetAllowances(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // TODO: RDSからアクティブな手当マスタ一覧を取得
    // - isActive=trueのみ
    // - displayOrderでソート

    return successResponse({
      allowances: [],
      total: 0,
    }, 200, event);
  } catch (error) {
    console.error('Error in handleGetAllowances:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '手当マスタ一覧の取得に失敗しました', undefined, event);
  }
}

/**
 * 手当マスタ詳細取得ハンドラー
 */
async function handleGetAllowanceDetail(allowanceId: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // TODO: RDSから手当マスタ詳細を取得

    return successResponse({}, 200, event);
  } catch (error) {
    console.error('Error in handleGetAllowanceDetail:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '手当マスタ詳細の取得に失敗しました', undefined, event);
  }
}

/**
 * 手当マスタ作成ハンドラー
 */
async function handleCreateAllowance(
  email: string,
  body: any,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    await getEmployeeInfo(email);
    
    // バリデーション
    if (!body) {
      return validationErrorResponse({ body: ['リクエストボディは必須です'] }, event);
    }
    
    const { name, color, includeInOvertime } = body;
    const fieldErrors: Record<string, string[]> = {};
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      fieldErrors.name = ['nameは必須です'];
    } else if (name.length > 100) {
      fieldErrors.name = ['nameは100文字以内で指定してください'];
    }
    
    if (!color || typeof color !== 'string') {
      fieldErrors.color = ['colorは必須です'];
    } else {
      // カラーコードの形式検証（16進数形式: #RRGGBB）
      const colorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!colorRegex.test(color)) {
        fieldErrors.color = ['colorは16進数形式（#RRGGBB）で指定してください'];
      }
    }
    
    if (includeInOvertime !== undefined && typeof includeInOvertime !== 'boolean') {
      fieldErrors.includeInOvertime = ['includeInOvertimeはboolean型で指定してください'];
    }
    
    if (Object.keys(fieldErrors).length > 0) {
      return validationErrorResponse(fieldErrors, event);
    }
    
    // TODO: 手当名の重複チェック
    // const existingAllowance = await getAllowanceByName(name);
    // if (existingAllowance) {
    //   return errorResponse(409, 'CONFLICT', '同じ名前の手当マスタが既に存在します', undefined, event);
    // }
    
    // TODO: RDSに手当マスタを登録
    // - isActive=true、displayOrder=999、includeInOvertime=false（デフォルト）を設定
    
    return successResponse(undefined, 201, event);
  } catch (error) {
    console.error('Error in handleCreateAllowance:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '手当マスタの作成に失敗しました', undefined, event);
  }
}

/**
 * 手当マスタ更新ハンドラー
 */
async function handleUpdateAllowance(
  email: string,
  allowanceId: string,
  body: any,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    await getEmployeeInfo(email);
    
    // TODO: RDSから手当マスタを取得
    // const allowance = await getAllowance(allowanceId);
    // if (!allowance) {
    //   return errorResponse(404, 'NOT_FOUND', '指定された手当マスタが見つかりません', undefined, event);
    // }
    
    // バリデーション（作成時と同じ）
    if (!body) {
      return validationErrorResponse({ body: ['リクエストボディは必須です'] }, event);
    }
    
    const { name, color, includeInOvertime } = body;
    const fieldErrors: Record<string, string[]> = {};
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      fieldErrors.name = ['nameは必須です'];
    } else if (name.length > 100) {
      fieldErrors.name = ['nameは100文字以内で指定してください'];
    }
    
    if (!color || typeof color !== 'string') {
      fieldErrors.color = ['colorは必須です'];
    } else {
      const colorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!colorRegex.test(color)) {
        fieldErrors.color = ['colorは16進数形式（#RRGGBB）で指定してください'];
      }
    }
    
    if (includeInOvertime !== undefined && typeof includeInOvertime !== 'boolean') {
      fieldErrors.includeInOvertime = ['includeInOvertimeはboolean型で指定してください'];
    }
    
    if (Object.keys(fieldErrors).length > 0) {
      return validationErrorResponse(fieldErrors, event);
    }
    
    // TODO: 手当名の重複チェック（自分以外）
    // const existingAllowance = await getAllowanceByName(name);
    // if (existingAllowance && existingAllowance.allowanceId !== allowanceId) {
    //   return errorResponse(409, 'CONFLICT', '同じ名前の手当マスタが既に存在します', undefined, event);
    // }
    
    // TODO: RDSで手当マスタを更新
    
    return successResponse(undefined, 200, event);
  } catch (error) {
    console.error('Error in handleUpdateAllowance:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '手当マスタの更新に失敗しました', undefined, event);
  }
}

/**
 * 手当マスタ削除ハンドラー
 */
async function handleDeleteAllowance(
  email: string,
  allowanceId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // TODO: 権限チェック（管理者のみ）
    // TODO: 従業員に紐づいている場合は削除不可
    // TODO: RDSで手当マスタを論理削除（isActive=false）

    return {
      statusCode: 204,
      headers: getCorsHeaders(event),
      body: '',
    };
  } catch (error) {
    console.error('Error in handleDeleteAllowance:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '手当マスタの削除に失敗しました', undefined, event);
  }
}

// ==================== 控除マスタAPI ====================

/**
 * 控除マスタ一覧取得ハンドラー
 */
async function handleGetDeductions(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // TODO: RDSからアクティブな控除マスタ一覧を取得
    // - isActive=trueのみ
    // - displayOrderでソート

    return successResponse({
      deductions: [],
      total: 0,
    }, 200, event);
  } catch (error) {
    console.error('Error in handleGetDeductions:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '控除マスタ一覧の取得に失敗しました', undefined, event);
  }
}

/**
 * 控除マスタ詳細取得ハンドラー
 */
async function handleGetDeductionDetail(deductionId: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // TODO: RDSから控除マスタ詳細を取得

    return successResponse({}, 200, event);
  } catch (error) {
    console.error('Error in handleGetDeductionDetail:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '控除マスタ詳細の取得に失敗しました', undefined, event);
  }
}

/**
 * 控除マスタ作成ハンドラー
 */
async function handleCreateDeduction(
  email: string,
  body: any,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    await getEmployeeInfo(email);
    
    // バリデーション
    if (!body) {
      return validationErrorResponse({ body: ['リクエストボディは必須です'] }, event);
    }
    
    const { name } = body;
    const fieldErrors: Record<string, string[]> = {};
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      fieldErrors.name = ['nameは必須です'];
    } else if (name.length > 100) {
      fieldErrors.name = ['nameは100文字以内で指定してください'];
    }
    
    if (Object.keys(fieldErrors).length > 0) {
      return validationErrorResponse(fieldErrors, event);
    }
    
    // TODO: 控除名の重複チェック
    // const existingDeduction = await getDeductionByName(name);
    // if (existingDeduction) {
    //   return errorResponse(409, 'CONFLICT', '同じ名前の控除マスタが既に存在します', undefined, event);
    // }
    
    // TODO: RDSに控除マスタを登録
    // - isActive=true、displayOrder=999（デフォルト）を設定
    
    return successResponse(undefined, 201, event);
  } catch (error) {
    console.error('Error in handleCreateDeduction:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '控除マスタの作成に失敗しました', undefined, event);
  }
}

/**
 * 控除マスタ更新ハンドラー
 */
async function handleUpdateDeduction(
  email: string,
  deductionId: string,
  body: any,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    await getEmployeeInfo(email);
    
    // TODO: RDSから控除マスタを取得
    // const deduction = await getDeduction(deductionId);
    // if (!deduction) {
    //   return errorResponse(404, 'NOT_FOUND', '指定された控除マスタが見つかりません', undefined, event);
    // }
    
    // バリデーション（作成時と同じ）
    if (!body) {
      return validationErrorResponse({ body: ['リクエストボディは必須です'] }, event);
    }
    
    const { name } = body;
    const fieldErrors: Record<string, string[]> = {};
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      fieldErrors.name = ['nameは必須です'];
    } else if (name.length > 100) {
      fieldErrors.name = ['nameは100文字以内で指定してください'];
    }
    
    if (Object.keys(fieldErrors).length > 0) {
      return validationErrorResponse(fieldErrors, event);
    }
    
    // TODO: 控除名の重複チェック（自分以外）
    // const existingDeduction = await getDeductionByName(name);
    // if (existingDeduction && existingDeduction.deductionId !== deductionId) {
    //   return errorResponse(409, 'CONFLICT', '同じ名前の控除マスタが既に存在します', undefined, event);
    // }
    
    // TODO: RDSで控除マスタを更新
    
    return successResponse(undefined, 200, event);
  } catch (error) {
    console.error('Error in handleUpdateDeduction:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '控除マスタの更新に失敗しました', undefined, event);
  }
}

/**
 * 控除マスタ削除ハンドラー
 */
async function handleDeleteDeduction(
  email: string,
  deductionId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // TODO: 権限チェック（管理者のみ）
    // TODO: 給与明細で使用されている場合は削除不可
    // TODO: RDSで控除マスタを論理削除（isActive=false）

    return {
      statusCode: 204,
      headers: getCorsHeaders(event),
      body: '',
    };
  } catch (error) {
    console.error('Error in handleDeleteDeduction:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '控除マスタの削除に失敗しました', undefined, event);
  }
}

// ==================== 休暇申請API ====================

/**
 * 休暇申請一覧取得ハンドラー
 */
async function handleGetLeaveRequests(
  email: string,
  queryParams: Record<string, string>,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // TODO: 権限チェック（一般従業員は自分の申請のみ、管理者は全申請）
    // TODO: RDSから休暇申請一覧を取得
    // - employeeId、status、leaveType、fiscalYear、startDate、endDateでフィルタ

    return successResponse({
      requests: [],
      total: 0,
    });
  } catch (error) {
    console.error('Error in handleGetLeaveRequests:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '休暇申請一覧の取得に失敗しました', undefined, event);
  }
}

/**
 * 休暇申請詳細取得ハンドラー
 */
async function handleGetLeaveRequestDetail(
  email: string,
  requestId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // TODO: 権限チェック（一般従業員は自分の申請のみ、管理者は全申請）
    // TODO: RDSから休暇申請詳細を取得

    return successResponse({});
  } catch (error) {
    console.error('Error in handleGetLeaveRequestDetail:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '休暇申請詳細の取得に失敗しました', undefined, event);
  }
}

/**
 * 休暇申請作成ハンドラー
 */
async function handleCreateLeaveRequest(
  email: string,
  body: any,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    const employeeInfo = await getEmployeeInfo(email);
    
    // バリデーション
    if (!body) {
      return validationErrorResponse({ body: ['リクエストボディは必須です'] });
    }
    
    const { startDate, endDate, leaveType, reason, days, isHalfDay } = body;
    const fieldErrors: Record<string, string[]> = {};
    
    if (!startDate || typeof startDate !== 'string') {
      fieldErrors.startDate = ['startDateは必須です（YYYY-MM-DD形式）'];
    } else if (!isValidDate(startDate)) {
      fieldErrors.startDate = ['startDateはYYYY-MM-DD形式で指定してください'];
    }
    
    if (!endDate || typeof endDate !== 'string') {
      fieldErrors.endDate = ['endDateは必須です（YYYY-MM-DD形式）'];
    } else if (!isValidDate(endDate)) {
      fieldErrors.endDate = ['endDateはYYYY-MM-DD形式で指定してください'];
    }
    
    if (startDate && endDate && isValidDate(startDate) && isValidDate(endDate)) {
      if (!isDateBeforeOrEqual(startDate, endDate)) {
        fieldErrors.endDate = ['endDateはstartDate以降の日付を指定してください'];
      }
    }
    
    if (!leaveType || typeof leaveType !== 'string') {
      fieldErrors.leaveType = ['leaveTypeは必須です'];
    } else {
      const validLeaveTypes = ['paid', 'special', 'sick', 'absence', 'other'];
      if (!validLeaveTypes.includes(leaveType)) {
        fieldErrors.leaveType = [`leaveTypeは${validLeaveTypes.join(', ')}のいずれかを指定してください`];
      }
    }
    
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      fieldErrors.reason = ['reasonは必須です'];
    }
    
    if (days === undefined || days === null || typeof days !== 'number' || days <= 0) {
      fieldErrors.days = ['daysは正の数値で指定してください'];
    }
    
    if (isHalfDay !== undefined && typeof isHalfDay !== 'boolean') {
      fieldErrors.isHalfDay = ['isHalfDayはboolean型で指定してください'];
    }
    
    if (Object.keys(fieldErrors).length > 0) {
      return validationErrorResponse(fieldErrors);
    }
    
    // 日数の再計算（開始日と終了日を含む）
    const calculatedDays = calculateDays(startDate, endDate);
    if (isHalfDay) {
      // 半休の場合は0.5日
      const finalDays = 0.5;
      if (days !== finalDays) {
        fieldErrors.days = [`半休の場合はdaysは0.5を指定してください（計算値: ${finalDays}）`];
        return validationErrorResponse(fieldErrors);
      }
    } else {
      // 全休の場合は計算値と一致する必要がある
      if (Math.abs(days - calculatedDays) > 0.01) {
        fieldErrors.days = [`daysは開始日と終了日から計算された日数と一致する必要があります（計算値: ${calculatedDays}）`];
        return validationErrorResponse(fieldErrors);
      }
    }
    
    // TODO: 有給の場合、有給残日数の確認
    // if (leaveType === 'paid') {
    //   const remainingPaidLeave = await getRemainingPaidLeave(employeeInfo.employeeId);
    //   if (remainingPaidLeave < days) {
    //     return errorResponse(400, 'BAD_REQUEST', `有給残日数が不足しています（残日数: ${remainingPaidLeave}日、申請日数: ${days}日）`);
    //   }
    // }
    
    // TODO: 期間の重複チェック
    // const overlappingRequests = await getOverlappingLeaveRequests(employeeInfo.employeeId, startDate, endDate);
    // if (overlappingRequests.length > 0) {
    //   return errorResponse(409, 'CONFLICT', '指定期間に既に休暇申請が存在します');
    // }
    
    // TODO: RDSに休暇申請を登録
    // - ステータスを「pending」（申請中）に設定
    // - 休暇種別は英語コードで受信し、DBには日本語で保存
    
    return successResponse(undefined, 201);
  } catch (error) {
    console.error('Error in handleCreateLeaveRequest:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '休暇申請の作成に失敗しました', undefined, event);
  }
}

/**
 * 休暇申請更新ハンドラー
 */
async function handleUpdateLeaveRequest(
  email: string,
  requestId: string,
  body: any,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    const employeeInfo = await getEmployeeInfo(email);
    
    // TODO: RDSから休暇申請を取得
    // const leaveRequest = await getLeaveRequest(requestId);
    // if (!leaveRequest) {
    //   return errorResponse(404, 'NOT_FOUND', '指定された休暇申請が見つかりません');
    // }
    
    // 権限チェック（自分の申請のみ）
    // if (leaveRequest.employeeId !== employeeInfo.employeeId) {
    //   return errorResponse(403, 'FORBIDDEN', '他の従業員の休暇申請を更新する権限がありません');
    // }
    
    // 承認済みの申請は更新不可
    // if (leaveRequest.status === 'approved') {
    //   return errorResponse(400, 'BAD_REQUEST', '承認済みの申請は更新できません');
    // }
    
    // バリデーション（作成時と同じ）
    if (!body) {
      return validationErrorResponse({ body: ['リクエストボディは必須です'] });
    }
    
    const { startDate, endDate, leaveType, reason, days, isHalfDay } = body;
    const fieldErrors: Record<string, string[]> = {};
    
    if (!startDate || typeof startDate !== 'string') {
      fieldErrors.startDate = ['startDateは必須です（YYYY-MM-DD形式）'];
    } else if (!isValidDate(startDate)) {
      fieldErrors.startDate = ['startDateはYYYY-MM-DD形式で指定してください'];
    }
    
    if (!endDate || typeof endDate !== 'string') {
      fieldErrors.endDate = ['endDateは必須です（YYYY-MM-DD形式）'];
    } else if (!isValidDate(endDate)) {
      fieldErrors.endDate = ['endDateはYYYY-MM-DD形式で指定してください'];
    }
    
    if (startDate && endDate && isValidDate(startDate) && isValidDate(endDate)) {
      if (!isDateBeforeOrEqual(startDate, endDate)) {
        fieldErrors.endDate = ['endDateはstartDate以降の日付を指定してください'];
      }
    }
    
    if (!leaveType || typeof leaveType !== 'string') {
      fieldErrors.leaveType = ['leaveTypeは必須です'];
    } else {
      const validLeaveTypes = ['paid', 'special', 'sick', 'absence', 'other'];
      if (!validLeaveTypes.includes(leaveType)) {
        fieldErrors.leaveType = [`leaveTypeは${validLeaveTypes.join(', ')}のいずれかを指定してください`];
      }
    }
    
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      fieldErrors.reason = ['reasonは必須です'];
    }
    
    if (days === undefined || days === null || typeof days !== 'number' || days <= 0) {
      fieldErrors.days = ['daysは正の数値で指定してください'];
    }
    
    if (isHalfDay !== undefined && typeof isHalfDay !== 'boolean') {
      fieldErrors.isHalfDay = ['isHalfDayはboolean型で指定してください'];
    }
    
    if (Object.keys(fieldErrors).length > 0) {
      return validationErrorResponse(fieldErrors);
    }
    
    // 日数の再計算
    const calculatedDays = calculateDays(startDate, endDate);
    if (isHalfDay) {
      const finalDays = 0.5;
      if (days !== finalDays) {
        fieldErrors.days = [`半休の場合はdaysは0.5を指定してください（計算値: ${finalDays}）`];
        return validationErrorResponse(fieldErrors);
      }
    } else {
      if (Math.abs(days - calculatedDays) > 0.01) {
        fieldErrors.days = [`daysは開始日と終了日から計算された日数と一致する必要があります（計算値: ${calculatedDays}）`];
        return validationErrorResponse(fieldErrors);
      }
    }
    
    // TODO: 有給の場合、有給残日数の確認（既存の申請分を除く）
    // if (leaveType === 'paid') {
    //   const remainingPaidLeave = await getRemainingPaidLeave(employeeInfo.employeeId, requestId);
    //   if (remainingPaidLeave < days) {
    //     return errorResponse(400, 'BAD_REQUEST', `有給残日数が不足しています（残日数: ${remainingPaidLeave}日、申請日数: ${days}日）`);
    //   }
    // }
    
    // TODO: 期間の重複チェック（自分自身の申請を除く）
    // const overlappingRequests = await getOverlappingLeaveRequests(employeeInfo.employeeId, startDate, endDate, requestId);
    // if (overlappingRequests.length > 0) {
    //   return errorResponse(409, 'CONFLICT', '指定期間に既に休暇申請が存在します');
    // }
    
    // TODO: RDSで休暇申請を更新
    
    return successResponse();
  } catch (error) {
    console.error('Error in handleUpdateLeaveRequest:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '休暇申請の更新に失敗しました', undefined, event);
  }
}

/**
 * 休暇申請削除ハンドラー
 */
async function handleDeleteLeaveRequest(
  email: string,
  requestId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    const employeeInfo = await getEmployeeInfo(email);
    
    // TODO: RDSから休暇申請を取得
    // const leaveRequest = await getLeaveRequest(requestId);
    // if (!leaveRequest) {
    //   return errorResponse(404, 'NOT_FOUND', '指定された休暇申請が見つかりません');
    // }
    
    // 権限チェック（自分の申請のみ）
    // if (leaveRequest.employeeId !== employeeInfo.employeeId) {
    //   return errorResponse(403, 'FORBIDDEN', '他の従業員の休暇申請を削除する権限がありません');
    // }
    
    // 承認済みの申請は削除不可
    // if (leaveRequest.status === 'approved') {
    //   return errorResponse(400, 'BAD_REQUEST', '承認済みの申請は削除できません');
    // }
    
    // TODO: RDSで休暇申請を論理削除（ステータスを「deleted」（削除済み）に設定）

    return {
      statusCode: 204,
      headers: getCorsHeaders(event),
      body: '',
    };
  } catch (error) {
    console.error('Error in handleDeleteLeaveRequest:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '休暇申請の削除に失敗しました', undefined, event);
  }
}

/**
 * 休暇申請承認ハンドラー
 */
async function handleApproveLeaveRequest(
  email: string,
  requestId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    const employeeInfo = await getEmployeeInfo(email);
    
    // TODO: RDSから休暇申請を取得
    // const leaveRequest = await getLeaveRequest(requestId);
    // if (!leaveRequest) {
    //   return errorResponse(404, 'NOT_FOUND', '指定された休暇申請が見つかりません');
    // }
    
    // 既に承認済みの場合はエラー
    // if (leaveRequest.status === 'approved') {
    //   return errorResponse(400, 'BAD_REQUEST', '既に承認済みの申請です');
    // }
    
    // 削除済みの場合はエラー
    // if (leaveRequest.status === 'deleted') {
    //   return errorResponse(400, 'BAD_REQUEST', '削除済みの申請は承認できません');
    // }
    
    // TODO: RDSで休暇申請を承認（トランザクション管理）
    // - 有給の場合（leaveType === 'paid'）、有給消費記録を自動作成
    //   - 有給付与台帳から古い順に消費
    // - ステータスを「approved」（承認）に設定
    // - 承認日時（approvedAt）と承認者ID（approvedBy）を記録
    // - approvedByにはemployeeInfo.employeeIdを設定

    return successResponse();
  } catch (error) {
    console.error('Error in handleApproveLeaveRequest:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '休暇申請の承認に失敗しました', undefined, event);
  }
}

/**
 * 休暇申請却下ハンドラー
 */
async function handleRejectLeaveRequest(
  email: string,
  requestId: string,
  body: any,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    const employeeInfo = await getEmployeeInfo(email);
    
    // TODO: RDSから休暇申請を取得
    // const leaveRequest = await getLeaveRequest(requestId);
    // if (!leaveRequest) {
    //   return errorResponse(404, 'NOT_FOUND', '指定された休暇申請が見つかりません');
    // }
    
    // 既に承認済みの場合はエラー
    // if (leaveRequest.status === 'approved') {
    //   return errorResponse(400, 'BAD_REQUEST', '承認済みの申請は却下できません');
    // }
    
    // 削除済みの場合はエラー
    // if (leaveRequest.status === 'deleted') {
    //   return errorResponse(400, 'BAD_REQUEST', '削除済みの申請は却下できません');
    // }
    
    // バリデーション（rejectionReasonはオプション）
    const { rejectionReason } = body || {};
    if (rejectionReason !== undefined && (typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0)) {
      return validationErrorResponse({ rejectionReason: ['rejectionReasonは文字列で指定してください'] });
    }
    
    // TODO: RDSで休暇申請を却下
    // - ステータスを「rejected」（取消）に設定
    // - 却下理由（rejectionReason）を記録
    // - 承認日時（approvedAt）と承認者ID（approvedBy）を記録
    // - approvedByにはemployeeInfo.employeeIdを設定

    return successResponse();
  } catch (error) {
    console.error('Error in handleRejectLeaveRequest:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '休暇申請の却下に失敗しました', undefined, event);
  }
}

// ==================== 申請一覧API ====================

/**
 * 申請一覧取得ハンドラー
 */
async function handleGetApplications(
  email: string,
  queryParams: Record<string, string>,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // TODO: 権限チェック（一般従業員は自分の申請のみ、管理者は全申請）
    // TODO: RDSから申請一覧を取得
    // - 休暇申請と打刻修正申請を統合
    // - startYearMonth、endYearMonth、type、statusでフィルタ
    // - requestedAtで降順ソート

    return successResponse({
      requests: [],
      total: 0,
    });
  } catch (error) {
    console.error('Error in handleGetApplications:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '申請一覧の取得に失敗しました', undefined, event);
  }
}

/**
 * 申請ステータス更新ハンドラー
 */
async function handleUpdateApplicationStatus(
  email: string,
  body: any,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // TODO: 権限チェック（管理者のみ）
    // TODO: RDSで申請ステータスを更新
    // - typeに基づいて、休暇申請または打刻修正申請を判定
    // - actionがapproveの場合、承認処理を実行
    // - actionがrejectの場合、却下処理を実行
    // - 休暇申請の場合、承認時に有給消費記録を作成（有給の場合）
    // - トランザクション管理

    return successResponse();
  } catch (error) {
    console.error('Error in handleUpdateApplicationStatus:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '申請ステータスの更新に失敗しました', undefined, event);
  }
}

// ==================== 給与明細API ====================

/**
 * 給与明細一覧取得ハンドラー
 */
async function handleGetPayrollList(
  email: string,
  queryParams: Record<string, string>,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // TODO: 権限チェック（管理者のみ）
    // TODO: RDSから給与明細一覧を取得
    // - employeeId、fiscalYear、year、monthでフィルタ
    // - 有効な給与明細（isActive=true）のみ取得
    // - statementTypeを自動判定

    return successResponse({
      records: [],
      total: 0,
    });
  } catch (error) {
    console.error('Error in handleGetPayrollList:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '給与明細一覧の取得に失敗しました', undefined, event);
  }
}

/**
 * 給与明細詳細取得ハンドラー
 */
async function handleGetPayrollDetail(
  email: string,
  payrollId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // TODO: 権限チェック（管理者のみ）
    // TODO: RDSから給与明細詳細を取得
    // - 有効な給与明細（isActive=true）のみ取得
    // - 詳細項目と控除項目も含めて取得（有効なもののみ）
    // - statementTypeを自動判定
    // - 控除項目を自動的に分類

    return successResponse({});
  } catch (error) {
    console.error('Error in handleGetPayrollDetail:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '給与明細詳細の取得に失敗しました', undefined, event);
  }
}

/**
 * 給与明細作成ハンドラー
 */
async function handleCreatePayroll(
  email: string,
  body: any,
  headers: Record<string, string | undefined>,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    await getEmployeeInfo(email);
    
    // X-Requested-Byヘッダーの取得（オプション）
    const requestedBy = getDecodedRequestedBy(headers);
    
    // バリデーション
    if (!body) {
      return validationErrorResponse({ body: ['リクエストボディは必須です'] });
    }
    
    const { employeeId, year, month, statementType, detail } = body;
    const fieldErrors: Record<string, string[]> = {};
    
    if (!employeeId || typeof employeeId !== 'string') {
      fieldErrors.employeeId = ['employeeIdは必須です'];
    }
    
    if (year === undefined || year === null || typeof year !== 'number' || year < 2000 || year > 3000) {
      fieldErrors.year = ['yearは2000-3000の範囲の数値で指定してください'];
    }
    
    if (month === undefined || month === null || typeof month !== 'number' || month < 1 || month > 12) {
      fieldErrors.month = ['monthは1-12の範囲の数値で指定してください'];
    }
    
    if (!statementType || typeof statementType !== 'string') {
      fieldErrors.statementType = ['statementTypeは必須です'];
    } else {
      const validStatementTypes = ['salary', 'bonus'];
      if (!validStatementTypes.includes(statementType)) {
        fieldErrors.statementType = [`statementTypeは${validStatementTypes.join(', ')}のいずれかを指定してください`];
      }
    }
    
    if (!detail || typeof detail !== 'object') {
      fieldErrors.detail = ['detailは必須です（オブジェクト）'];
    } else {
      // detailのバリデーション
      const requiredFields = [
        'workingDays', 'holidayWork', 'paidLeave', 'paidLeaveRemaining',
        'normalOvertime', 'lateNightOvertime', 'baseSalary',
        'overtimeAllowance', 'lateNightAllowance', 'mealAllowance',
        'commutingAllowance', 'housingAllowance', 'allowances',
        'totalEarnings', 'socialInsurance', 'employeePension',
        'employmentInsurance', 'municipalTax', 'incomeTax',
        'deductions', 'totalDeductions', 'netPay'
      ];
      
      for (const field of requiredFields) {
        if (detail[field] === undefined || detail[field] === null) {
          fieldErrors[`detail.${field}`] = [`detail.${field}は必須です`];
        }
      }
      
      // 数値フィールドのバリデーション
      const numericFields = [
        'workingDays', 'holidayWork', 'paidLeave', 'paidLeaveRemaining',
        'normalOvertime', 'lateNightOvertime', 'baseSalary',
        'overtimeAllowance', 'lateNightAllowance', 'mealAllowance',
        'commutingAllowance', 'housingAllowance', 'totalEarnings',
        'socialInsurance', 'employeePension', 'employmentInsurance',
        'municipalTax', 'incomeTax', 'totalDeductions', 'netPay'
      ];
      
      for (const field of numericFields) {
        if (detail[field] !== undefined && detail[field] !== null) {
          if (typeof detail[field] !== 'number' || detail[field] < 0) {
            fieldErrors[`detail.${field}`] = [`detail.${field}は0以上の数値で指定してください`];
          }
        }
      }
      
      // allowancesとdeductionsはオブジェクトである必要がある
      if (detail.allowances !== undefined && typeof detail.allowances !== 'object') {
        fieldErrors['detail.allowances'] = ['detail.allowancesはオブジェクトで指定してください'];
      }
      
      if (detail.deductions !== undefined && typeof detail.deductions !== 'object') {
        fieldErrors['detail.deductions'] = ['detail.deductionsはオブジェクトで指定してください'];
      }
    }
    
    if (Object.keys(fieldErrors).length > 0) {
      return validationErrorResponse(fieldErrors);
    }
    
    // TODO: 指定された年月の給与明細の重複チェック
    // const existingPayroll = await getPayrollByEmployeeAndMonth(employeeId, year, month);
    // if (existingPayroll) {
    //   return errorResponse(409, 'CONFLICT', '指定された年月の給与明細が既に存在します');
    // }
    
    // TODO: RDSに給与明細を登録（トランザクション管理）
    // - 給与明細ヘッダを作成
    // - 詳細項目と控除項目も同時に作成
    // - UI側から受け取った値をそのままDBに保存（スナップショット方式）
    // - requestedByがあれば、createdByおよびupdatedByに保存

    return successResponse(undefined, 201);
  } catch (error) {
    console.error('Error in handleCreatePayroll:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '給与明細の作成に失敗しました', undefined, event);
  }
}

/**
 * 給与明細更新ハンドラー
 */
async function handleUpdatePayroll(
  email: string,
  payrollId: string,
  body: any,
  headers: Record<string, string | undefined>,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    await getEmployeeInfo(email);
    
    // X-Requested-Byヘッダーの取得（オプション）
    const requestedBy = getDecodedRequestedBy(headers);
    
    // TODO: RDSから給与明細を取得
    // const payroll = await getPayroll(payrollId);
    // if (!payroll) {
    //   return errorResponse(404, 'NOT_FOUND', '指定された給与明細が見つかりません');
    // }
    
    // バリデーション（作成時と同じ）
    if (!body) {
      return validationErrorResponse({ body: ['リクエストボディは必須です'] });
    }
    
    const { employeeId, year, month, statementType, detail } = body;
    const fieldErrors: Record<string, string[]> = {};
    
    if (!employeeId || typeof employeeId !== 'string') {
      fieldErrors.employeeId = ['employeeIdは必須です'];
    }
    
    if (year === undefined || year === null || typeof year !== 'number' || year < 2000 || year > 3000) {
      fieldErrors.year = ['yearは2000-3000の範囲の数値で指定してください'];
    }
    
    if (month === undefined || month === null || typeof month !== 'number' || month < 1 || month > 12) {
      fieldErrors.month = ['monthは1-12の範囲の数値で指定してください'];
    }
    
    if (!statementType || typeof statementType !== 'string') {
      fieldErrors.statementType = ['statementTypeは必須です'];
    } else {
      const validStatementTypes = ['salary', 'bonus'];
      if (!validStatementTypes.includes(statementType)) {
        fieldErrors.statementType = [`statementTypeは${validStatementTypes.join(', ')}のいずれかを指定してください`];
      }
    }
    
    if (!detail || typeof detail !== 'object') {
      fieldErrors.detail = ['detailは必須です（オブジェクト）'];
    } else {
      // detailのバリデーション（作成時と同じ）
      const requiredFields = [
        'workingDays', 'holidayWork', 'paidLeave', 'paidLeaveRemaining',
        'normalOvertime', 'lateNightOvertime', 'baseSalary',
        'overtimeAllowance', 'lateNightAllowance', 'mealAllowance',
        'commutingAllowance', 'housingAllowance', 'allowances',
        'totalEarnings', 'socialInsurance', 'employeePension',
        'employmentInsurance', 'municipalTax', 'incomeTax',
        'deductions', 'totalDeductions', 'netPay'
      ];
      
      for (const field of requiredFields) {
        if (detail[field] === undefined || detail[field] === null) {
          fieldErrors[`detail.${field}`] = [`detail.${field}は必須です`];
        }
      }
      
      const numericFields = [
        'workingDays', 'holidayWork', 'paidLeave', 'paidLeaveRemaining',
        'normalOvertime', 'lateNightOvertime', 'baseSalary',
        'overtimeAllowance', 'lateNightAllowance', 'mealAllowance',
        'commutingAllowance', 'housingAllowance', 'totalEarnings',
        'socialInsurance', 'employeePension', 'employmentInsurance',
        'municipalTax', 'incomeTax', 'totalDeductions', 'netPay'
      ];
      
      for (const field of numericFields) {
        if (detail[field] !== undefined && detail[field] !== null) {
          if (typeof detail[field] !== 'number' || detail[field] < 0) {
            fieldErrors[`detail.${field}`] = [`detail.${field}は0以上の数値で指定してください`];
          }
        }
      }
      
      if (detail.allowances !== undefined && typeof detail.allowances !== 'object') {
        fieldErrors['detail.allowances'] = ['detail.allowancesはオブジェクトで指定してください'];
      }
      
      if (detail.deductions !== undefined && typeof detail.deductions !== 'object') {
        fieldErrors['detail.deductions'] = ['detail.deductionsはオブジェクトで指定してください'];
      }
    }
    
    if (Object.keys(fieldErrors).length > 0) {
      return validationErrorResponse(fieldErrors);
    }
    
    // TODO: RDSで給与明細を更新（トランザクション管理）
    // - 既存の詳細項目と控除項目を論理削除（isActive=false）してから新規作成（isActive=true）
    // - 総支給額と総控除額の再計算
    // - requestedByがあれば、updatedByに保存

    return successResponse();
  } catch (error) {
    console.error('Error in handleUpdatePayroll:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '給与明細の更新に失敗しました', undefined, event);
  }
}

/**
 * 給与明細メモ更新ハンドラー
 */
async function handleUpdatePayrollMemo(
  email: string,
  payrollId: string,
  body: any,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // 従業員情報を取得
    const employeeInfo = await getEmployeeInfo(email);
    
    // TODO: RDSから給与明細を取得
    // const payroll = await getPayroll(payrollId);
    // if (!payroll) {
    //   return errorResponse(404, 'NOT_FOUND', '指定された給与明細が見つかりません');
    // }
    
    // 権限チェック（管理者は全従業員、従業員は自分のメモのみ）
    // if (employeeInfo.role !== 'admin' && payroll.employeeId !== employeeInfo.employeeId) {
    //   return errorResponse(403, 'FORBIDDEN', '他の従業員の給与明細メモを更新する権限がありません');
    // }
    
    // バリデーション
    if (!body) {
      return validationErrorResponse({ body: ['リクエストボディは必須です'] });
    }
    
    const { memo } = body;
    if (memo !== undefined && memo !== null && typeof memo !== 'string') {
      return validationErrorResponse({ memo: ['memoは文字列またはnullで指定してください'] });
    }
    
    // TODO: RDSで給与明細のメモを更新
    // - memoにnullを指定するとメモを削除

    return successResponse();
  } catch (error) {
    console.error('Error in handleUpdatePayrollMemo:', error);
    return errorResponse(500, 'INTERNAL_SERVER_ERROR', '給与明細メモの更新に失敗しました', undefined, event);
  }
}
