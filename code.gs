// Ganti dengan Spreadsheet ID Anda
const SHEET_ID = '1XkX9J_Nz-GWNwgAzKmLwaCzTT48ys0BSiK7fk_ANlBA';

// FOLDER ID UNTUK MENYIMPAN UPLOAD TUGAS SISWA
const FOLDER_ID = '1VR7XqaQEJ9PMojGFBCScbmTOcPSEJt0h';

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request.payload || {};
    
    switch (action) {
      case 'login': return apiLogin(payload);
      case 'register': return apiRegister(payload);
      case 'addUser': return apiAddUser(payload);
      
      case 'getCourses': return apiGetCourses(payload);
      case 'addCourse': return apiAddCourse(payload);
      case 'deleteCourse': return apiDeleteRow('courses', payload.id);
      
      case 'getMaterials': return apiGetMaterials(payload);
      case 'addMaterial': return apiAddMaterial(payload);
      case 'editMaterial': return apiEditMaterial(payload); 
      case 'deleteMaterial': return apiDeleteRow('materials', payload.id);
      
      case 'getProgress': return apiGetProgress(payload);
      case 'markProgress': return apiMarkProgress(payload);
      case 'getCourseReport': return apiGetCourseReport(payload);

      case 'createTransaction': return apiCreateTransaction(payload);
      case 'getTransactions': return apiGetTransactions(payload);
      case 'updateTransactionStatus': return apiUpdateTransactionStatus(payload);

      case 'getQuiz': return apiGetQuiz(payload);
      case 'addQuizQuestion': return apiAddQuizQuestion(payload);
      case 'deleteQuizQuestion': return apiDeleteRow('quizzes', payload.id);
      case 'submitQuiz': return apiSubmitQuiz(payload);
      case 'getQuizScore': return apiGetQuizScore(payload);

      // --- TUGAS (UPLOAD FILE KE DRIVE) ---
      case 'submitAssignment': return apiSubmitAssignment(payload);
      case 'getSubmissions': return apiGetSubmissions(payload);
      case 'gradeAssignment': return apiGradeAssignment(payload);
      
      default: return responseJSON({ success: false, error: "Action tidak dikenali." });
    }
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  return responseJSON({ success: true, message: "API is running. Gunakan POST." });
}

// ==========================================
// CONTROLLERS
// ==========================================

function apiLogin(payload) {
  const users = getSheetData('users');
  const user = users.find(u => String(u.nisn) === String(payload.nisn));
  if (!user) return responseJSON({ success: false, error: "NISN tidak terdaftar." });
  if (user.password && String(user.password) !== String(payload.password)) {
    return responseJSON({ success: false, error: "Password yang Anda masukkan salah." });
  }
  return responseJSON({ success: true, data: user, message: "Login berhasil" });
}

function apiRegister(payload) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('users');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === payload.nisn) return responseJSON({ success: false, error: "NISN sudah terdaftar! Silakan langsung Login." });
  }
  const id = Utilities.getUuid();
  sheet.appendRow([id, payload.full_name, payload.nisn, 'student', new Date().toISOString(), payload.password]);
  return responseJSON({ success: true, message: "Pendaftaran berhasil! Silakan Login." });
}

function apiAddUser(payload) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('users');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === payload.nisn) return responseJSON({ success: false, error: "NISN sudah terdaftar!" });
  }
  const id = Utilities.getUuid();
  sheet.appendRow([id, payload.full_name, payload.nisn, payload.role, new Date().toISOString()]);
  return responseJSON({ success: true, message: "Pengguna ditambahkan!" });
}

function apiGetCourses(payload) {
  let courses = getSheetData('courses');
  if (payload && payload.role === 'teacher' && payload.teacher_id) {
    courses = courses.filter(c => c.teacher_id === payload.teacher_id);
  }
  return responseJSON({ success: true, data: courses });
}

function apiAddCourse(payload) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('courses');
  const id = Utilities.getUuid();
  const price = payload.price ? parseInt(payload.price) : 0; 
  sheet.appendRow([id, payload.title, payload.description, payload.teacher_id, 'active', new Date().toISOString(), price]);
  return responseJSON({ success: true, message: "Course berhasil ditambahkan." });
}

function apiGetMaterials(payload) {
  const materials = getSheetData('materials');
  const courseMaterials = materials.filter(m => m.course_id === payload.course_id);
  courseMaterials.sort((a, b) => a.order_number - b.order_number);
  return responseJSON({ success: true, data: courseMaterials });
}

function apiAddMaterial(payload) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('materials');
  const id = Utilities.getUuid();
  sheet.appendRow([id, payload.course_id, payload.title, payload.description, payload.content_url, payload.order_number, new Date().toISOString(), payload.embed_code || ""]);
  return responseJSON({ success: true, message: "Materi ditambahkan." });
}

function apiEditMaterial(payload) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('materials');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === payload.id) {
      sheet.getRange(i + 1, 3).setValue(payload.title);
      sheet.getRange(i + 1, 4).setValue(payload.description);
      sheet.getRange(i + 1, 5).setValue(payload.content_url); 
      sheet.getRange(i + 1, 6).setValue(payload.order_number);
      sheet.getRange(i + 1, 8).setValue(payload.embed_code || "");
      return responseJSON({ success: true, message: "Materi diperbarui." });
    }
  }
  return responseJSON({ success: false, error: "Materi tidak ditemukan." });
}

function apiGetProgress(payload) {
  const allProgress = getSheetData('progress');
  const studentProgress = allProgress.filter(p => p.student_id === payload.student_id);
  return responseJSON({ success: true, data: studentProgress });
}

function apiMarkProgress(payload) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('progress');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === payload.student_id && data[i][2] === payload.material_id) {
      return responseJSON({ success: true, message: "Materi sudah diselesaikan." });
    }
  }
  sheet.appendRow([Utilities.getUuid(), payload.student_id, payload.material_id, true, new Date().toISOString()]);
  return responseJSON({ success: true, message: "Progress disimpan." });
}

function apiGetCourseReport(payload) {
  const courseId = payload.course_id;
  const materials = getSheetData('materials').filter(m => m.course_id === courseId);
  const materialIds = materials.map(m => m.id);
  const students = getSheetData('users').filter(u => u.role === 'student');
  const progress = getSheetData('progress').filter(p => materialIds.includes(p.material_id) && p.is_completed === true);
  const allScores = getSheetData('quiz_scores').filter(s => s.course_id === courseId);
  
  return responseJSON({ success: true, data: { materialsCount: materials.length, students, progress, allScores } });
}

function apiCreateTransaction(payload) {
  const { student_id, course_id } = payload;
  const courses = getSheetData('courses');
  const course = courses.find(c => c.id === course_id);
  if (!course) return responseJSON({ success: false, error: "Kelas tidak ditemukan." });
  const price = course.price ? parseInt(course.price) : 0;
  const transactions = getSheetData('transactions');
  const existingTrx = transactions.find(t => t.student_id === student_id && t.course_id === course_id && (t.status === 'PAID' || t.status === 'PENDING'));
  if (existingTrx) {
    if (existingTrx.status === 'PAID') return responseJSON({ success: false, error: "Anda sudah memiliki akses ke kelas ini." });
    else if (existingTrx.status === 'PENDING') return responseJSON({ success: true, data: existingTrx, message: "Lanjutkan pembayaran Anda." });
  }
  const trxId = 'TRX-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
  const date = new Date().toISOString();
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('transactions');
  sheet.appendRow([trxId, student_id, course_id, price, 'PENDING', "", date]);
  return responseJSON({ success: true, data: { id: trxId, student_id, course_id, amount: price, status: 'PENDING', created_at: date }, message: "Tagihan berhasil dibuat." });
}

function apiGetTransactions(payload) {
  const transactions = getSheetData('transactions');
  if (payload.role === 'teacher') {
    const users = getSheetData('users');
    const courses = getSheetData('courses');
    const enriched = transactions.map(t => {
      const student = users.find(u => u.id === t.student_id);
      const course = courses.find(c => c.id === t.course_id);
      return { ...t, student_name: student ? student.full_name : 'Siswa Tidak Diketahui', course_title: course ? course.title : 'Kelas Tidak Ditemukan' };
    });
    enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return responseJSON({ success: true, data: enriched });
  }
  const userTrx = transactions.filter(t => t.student_id === payload.student_id);
  return responseJSON({ success: true, data: userTrx });
}

function apiUpdateTransactionStatus(payload) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('transactions');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === payload.id) { 
      sheet.getRange(i + 1, 5).setValue(payload.status);
      return responseJSON({ success: true, message: `Status berhasil diubah menjadi ${payload.status}.` });
    }
  }
  return responseJSON({ success: false, error: "Transaksi tidak ditemukan." });
}

function apiGetQuiz(payload) {
  const quizzes = getSheetData('quizzes').filter(q => q.course_id === payload.course_id);
  if (payload.role !== 'teacher') {
    const secureQuizzes = quizzes.map(q => { return { id: q.id, course_id: q.course_id, question: q.question, a: q.a, b: q.b, c: q.c, d: q.d }; });
    return responseJSON({ success: true, data: secureQuizzes });
  }
  return responseJSON({ success: true, data: quizzes });
}

function apiAddQuizQuestion(payload) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('quizzes');
  const id = Utilities.getUuid();
  sheet.appendRow([id, payload.course_id, payload.question, payload.a, payload.b, payload.c, payload.d, payload.correct]);
  return responseJSON({ success: true, message: "Soal kuis berhasil ditambahkan." });
}

function apiSubmitQuiz(payload) {
  const { student_id, course_id, answers } = payload; 
  const quizzes = getSheetData('quizzes').filter(q => q.course_id === course_id);
  if (quizzes.length === 0) return responseJSON({ success: false, error: "Kuis belum tersedia untuk kelas ini." });

  let correctCount = 0;
  quizzes.forEach(q => { if (answers[q.id] === q.correct) correctCount++; });
  const score = Math.round((correctCount / quizzes.length) * 100);
  const passed = score >= 80;

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('quiz_scores');
  sheet.appendRow([Utilities.getUuid(), student_id, course_id, score, passed, new Date().toISOString()]);

  return responseJSON({ success: true, data: { score: score, passed: passed }, message: passed ? "Selamat, Anda Lulus!" : "Nilai Anda di bawah KKM. Silakan coba lagi." });
}

function apiGetQuizScore(payload) {
  const scores = getSheetData('quiz_scores').filter(s => s.student_id === payload.student_id && s.course_id === payload.course_id);
  if (scores.length === 0) return responseJSON({ success: true, data: null });
  const bestScore = scores.reduce((max, current) => current.score > max.score ? current : max, scores[0]);
  return responseJSON({ success: true, data: bestScore });
}

// --- LOGIKA UPLOAD FILE KE GOOGLE DRIVE ---
function apiSubmitAssignment(payload) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('submissions');
  const data = sheet.getDataRange().getValues();
  
  let fileUrl = "";

  // Upload ke Google Drive jika ada fileData
  if (payload.fileData) {
    try {
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const decoded = Utilities.base64Decode(payload.fileData);
      const blob = Utilities.newBlob(decoded, payload.mimeType, payload.fileName);
      const file = folder.createFile(blob);
      
      // Ubah akses file agar Guru bisa membukanya melalui link
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
    } catch (e) {
      return responseJSON({ success: false, error: "Gagal mengupload file tugas ke Google Drive: " + e.message });
    }
  }

  // Cek apakah siswa mengirim ulang tugas (Update URL)
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === payload.student_id && data[i][3] === payload.material_id) {
      sheet.getRange(i + 1, 5).setValue(fileUrl);
      sheet.getRange(i + 1, 7).setValue(new Date().toISOString());
      return responseJSON({ success: true, message: "Foto tugas berhasil diperbarui!" });
    }
  }
  
  // Jika baru mengumpulkan tugas
  const id = Utilities.getUuid();
  sheet.appendRow([id, payload.student_id, payload.course_id, payload.material_id, fileUrl, '', new Date().toISOString()]);
  return responseJSON({ success: true, message: "Foto tugas berhasil dikirim dan menunggu penilaian." });
}

function apiGetSubmissions(payload) {
  const submissions = getSheetData('submissions').filter(s => s.course_id === payload.course_id);
  const users = getSheetData('users');
  const materials = getSheetData('materials');
  const enrichedSubmissions = submissions.map(sub => {
    const student = users.find(u => u.id === sub.student_id);
    const material = materials.find(m => m.id === sub.material_id);
    return { ...sub, student_name: student ? student.full_name : 'Unknown', material_title: material ? material.title : 'Unknown' };
  });
  return responseJSON({ success: true, data: enrichedSubmissions });
}

function apiGradeAssignment(payload) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('submissions');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === payload.id) {
      sheet.getRange(i + 1, 6).setValue(payload.score);
      return responseJSON({ success: true, message: "Nilai tugas berhasil disimpan!" });
    }
  }
  return responseJSON({ success: false, error: "Data tugas tidak ditemukan." });
}

function apiDeleteRow(sheetName, id) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i > 0; i--) {
    if (data[i][0] === id) { 
      sheet.deleteRow(i + 1);
      return responseJSON({ success: true, message: "Data berhasil dihapus." });
    }
  }
  return responseJSON({ success: false, error: "Data tidak ditemukan." });
}

function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; 
  const headers = data[0];
  return data.slice(1).map(row => {
    let obj = {};
    headers.forEach((header, index) => { obj[header] = row[index] !== "" ? row[index] : null; });
    return obj;
  });
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}