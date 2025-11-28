const CONFIG_PATH = '.sys/config.json';
const THUMB_PREFIX = '.sys/thumbs';
const PAGE_SIZE = 24; // 每页显示数量

// ============================================================================
// 前端 HTML 代码 (Vue应用)
// ============================================================================
const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>逍遥 ☁️Cloud Drive</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        [v-cloak] { display: none; }
        .glass { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); }
        .dark .glass { background: rgba(30, 41, 59, 0.9); }
        .img-cover { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
        .group:hover .img-cover { transform: scale(1.05); }
        .modal-enter-active, .modal-leave-active, .toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
        .modal-enter-from, .modal-leave-to, .toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(10px); }
        .item-hidden { opacity: 0.6; border: 1px dashed #94a3b8; }
        .shake { animation: shake 0.5s; }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        .drag-overlay { background: rgba(59, 130, 246, 0.9); backdrop-filter: blur(4px); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .dark ::-webkit-scrollbar-thumb { background: #475569; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .preview-click-area { cursor: pointer; transition: opacity 0.2s; }
        .preview-click-area:hover { opacity: 0.95; }
        .storage-selector { transition: all 0.3s ease; }
        .storage-selector:hover { transform: translateY(-2px); }
        .storage-selector.active { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
    </style>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: { extend: { colors: { slate: { 850: '#151f2e' } } } }
        }
    </script>
</head>
<body class="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 min-h-screen font-sans transition-colors duration-300" @dragover.prevent="dragEnter" @dragleave.prevent="dragLeave" @drop.prevent="handleDrop">
    <div id="app" v-cloak class="max-w-7xl mx-auto p-3 md:p-6 pb-20 relative min-h-screen flex flex-col">
        
        <transition name="modal">
            <div v-if="isDragging" class="fixed inset-0 z-50 drag-overlay flex flex-col items-center justify-center text-white pointer-events-none">
                <i class="fa-solid fa-cloud-arrow-up text-8xl mb-4 animate-bounce"></i>
                <h2 class="text-3xl font-bold">释放以上传文件</h2>
            </div>
        </transition>

        <header class="flex flex-wrap gap-3 justify-between items-center mb-4 bg-white dark:bg-slate-800 p-3 md:p-4 rounded-2xl shadow-sm sticky top-2 z-30 opacity-95 backdrop-blur transition-colors">
            <div class="flex items-center gap-3 overflow-hidden cursor-pointer" @click="toggleDarkMode">
                <div class="bg-blue-600 text-white w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
                    <i class="fa-solid fa-cloud text-lg"></i>
                </div>
                <h1 class="text-lg font-bold truncate">逍遥云盘</h1>
            </div>
            
            <!-- 存储选择器 -->
            <div class="flex gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                <button @click="switchStorage('local')" 
                        class="storage-selector px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                        :class="{'active': currentStorage === 'local'}">
                    <i class="fa-solid fa-hard-drive mr-1"></i> R2盘
                </button>
                <button @click="switchStorage('onedrive')" 
                        class="storage-selector px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                        :class="{'active': currentStorage === 'onedrive'}">
                    <i class="fa-brands fa-microsoft mr-1"></i> OneDrive
                </button>
            </div>
            
            <!-- 搜索框 -->
            <div class="flex-1 max-w-md mx-2 md:mx-4 relative group">
                <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition"></i>
                <input v-model="searchQuery" type="text" placeholder="搜索当前页..." class="w-full bg-slate-100 dark:bg-slate-700/50 border-none rounded-xl py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                    <i class="fa-solid fa-circle-xmark"></i>
                </button>
            </div>

            <!-- 排序按钮 -->
            <button @click="toggleSort" class="w-9 h-9 md:w-auto md:px-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center gap-2 shrink-0" :title="sortType === 'time' ? '当前：时间(新到旧)' : '当前：默认(文件名)'">
                <i class="fa-solid" :class="sortType === 'time' ? 'fa-clock text-blue-500' : 'fa-arrow-down-a-z'"></i>
                <span class="hidden md:inline text-xs md:text-sm font-medium">{{ sortType === 'time' ? '最新' : '默认' }}</span>
            </button>

            <div class="flex gap-2 shrink-0">
                <button v-if="isAdmin" @click="logout" class="text-xs md:text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition font-medium">
                    <i class="fa-solid fa-power-off"></i>
                </button>
                <button v-else @click="showLogin = true" class="text-xs md:text-sm bg-slate-800 dark:bg-slate-700 text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition font-medium">
                    <i class="fa-solid fa-user-shield"></i> <span class="hidden md:inline">管理</span>
                </button>
            </div>
        </header>

        <div class="flex items-center gap-1 mb-4 text-sm overflow-x-auto whitespace-nowrap pb-2 px-1 scrollbar-hide">
            <button @click="navigate('/')" class="hover:bg-white dark:hover:bg-slate-800 px-2 py-1 rounded text-slate-500 dark:text-slate-400 hover:text-blue-600 transition">
                <i class="fa-solid fa-house"></i>
            </button>
            <span v-for="(part, index) in breadcrumbs" :key="index" class="flex items-center">
                <i class="fa-solid fa-chevron-right text-slate-300 text-xs mx-1"></i>
                <button @click="navigate(part.path)" class="hover:bg-white dark:hover:bg-slate-800 px-2 py-1 rounded hover:text-blue-600 dark:text-slate-300 font-medium transition">
                    {{ part.name }}
                </button>
            </span>
        </div>

        <div v-if="isAdmin && (currentStorage === 'local' || currentStorage === 'onedrive')" class="mb-6 grid grid-cols-2 md:flex gap-2">
            <label class="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition active:scale-95 text-sm md:text-base">
                <i class="fa-solid fa-cloud-arrow-up"></i> 上传文件
                <input type="file" class="hidden" @change="handleUploadInput" multiple>
            </label>
            <button @click="createFolder" class="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95 text-sm md:text-base">
                <i class="fa-solid fa-folder-plus text-yellow-500 mr-1"></i> 新建
            </button>
            <button v-if="currentStorage === 'local' || currentStorage === 'onedrive'" @click="setFolderPassword" class="col-span-2 md:col-span-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95 text-sm md:text-base">
                <i class="fa-solid fa-lock text-slate-400 mr-1"></i> 加密
            </button>
            <button v-if="currentStorage === 'local' || currentStorage === 'onedrive'" @click="toggleHiddenFolder" class="col-span-2 md:col-span-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95 text-sm md:text-base">
                <i class="fa-solid fa-eye-slash text-slate-400 mr-1"></i> 显隐
            </button>
        </div>
        
        <div v-if="uploadProgress > 0 && uploadProgress < 100" class="mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-blue-100 dark:border-slate-700">
            <div class="flex justify-between text-xs font-bold mb-1 text-blue-600">
                <span>正在上传...</span>
                <span>{{ uploadProgress }}%</span>
            </div>
            <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                <div class="bg-blue-500 h-2 rounded-full transition-all duration-300" :style="{ width: uploadProgress + '%' }"></div>
            </div>
        </div>

        <div v-if="loading" class="py-20 text-center">
            <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        </div>

        <div v-else class="min-h-[50vh]">
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4 mb-8">
                
                <!-- 文件夹列表 -->
                <div v-for="folder in filteredFolders" :key="folder.path" 
                     @click="navigate(folder.path)"
                     :class="{'item-hidden': folder.hidden}"
                     class="group bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition border border-transparent hover:border-blue-200 dark:hover:border-slate-600 flex flex-col items-center justify-center aspect-[1/0.85] relative overflow-hidden">
                    
                    <div v-if="folder.hidden" class="absolute top-2 right-2 text-slate-400 text-xs"><i class="fa-solid fa-eye-slash"></i></div>
                    
                    <i class="fa-solid fa-folder text-5xl md:text-6xl text-yellow-400 mb-2 drop-shadow-sm group-hover:scale-110 transition duration-300"></i>
                    <div class="font-medium text-slate-700 dark:text-slate-200 text-sm truncate w-full text-center px-2">{{ folder.name }}</div>
                </div>

                <!-- 文件列表 -->
                <div v-for="(file, idx) in filteredFiles" :key="file.name" 
                     class="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md transition relative overflow-hidden border border-slate-100 dark:border-slate-700 flex flex-col">
                    
                    <div class="aspect-square bg-slate-50 dark:bg-slate-900 relative cursor-pointer overflow-hidden" @click="openPreview(file)">
                        <img v-if="isImage(file.name)" 
                             :src="getFileUrl(file.name, true)" 
                             @error="imgError($event, file.name)"
                             loading="lazy" 
                             class="img-cover bg-slate-200 dark:bg-slate-800">
                        
                        <div v-else-if="isVideo(file.name)" class="w-full h-full flex items-center justify-center bg-slate-900 group-hover:bg-slate-800 transition">
                             <i class="fa-solid fa-circle-play text-4xl text-white/80"></i>
                        </div>
                        <div v-else class="w-full h-full flex items-center justify-center">
                            <i :class="getFileIcon(file.name)" class="text-5xl md:text-6xl"></i>
                        </div>
                    </div>

                    <div class="p-3 bg-white dark:bg-slate-800 z-10 border-t border-slate-50 dark:border-slate-700">
                        <div class="font-medium text-slate-700 dark:text-slate-200 text-sm truncate" :title="file.name">{{ file.name }}</div>
                        <div class="flex justify-between items-center mt-1">
                            <div class="text-xs text-slate-400">{{ formatSize(file.size) }}</div>
                            <div class="flex gap-3">
                                <a :href="getFileUrl(file.name, false, true)" :download="file.name" @click.stop class="text-slate-400 hover:text-blue-500 transition"><i class="fa-solid fa-download"></i></a>
                                <button @click.stop="openShareModal(file.name, false)" class="text-slate-400 hover:text-green-500 transition"><i class="fa-solid fa-share-nodes"></i></button>
                                <button v-if="isAdmin" @click.stop="deleteFile(file)" class="text-slate-400 hover:text-red-500 transition"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                        <!-- 显示上传时间 -->
                        <div class="text-[10px] text-slate-300 dark:text-slate-600 mt-1 truncate" v-if="file.uploaded">
                            {{ formatDate(file.uploaded) }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 暂无数据 -->
            <div v-if="(!filteredFolders || filteredFolders.length === 0) && (!filteredFiles || filteredFiles.length === 0)" class="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-600">
                <i class="fa-solid fa-folder-open text-6xl mb-4"></i>
                <p v-if="searchQuery">没有找到匹配项</p>
                <p v-else>空空如也</p>
            </div>
        </div>

        <!-- 页码分页控制器 -->
        <div v-if="!loading && (pageNum > 1 || hasMore)" class="flex justify-center items-center gap-4 mt-auto py-6 border-t border-slate-200 dark:border-slate-800">
            <button 
                @click="changePage(-1)" 
                :disabled="pageNum === 1"
                class="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 shadow-sm">
                <i class="fa-solid fa-chevron-left"></i> 上一页
            </button>
            
            <span class="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md">
                第 {{ pageNum }} 页
            </span>

            <button 
                @click="changePage(1)" 
                :disabled="!hasMore"
                class="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 shadow-sm">
                下一页 <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>

        <!-- Toast -->
        <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
            <transition-group name="toast">
                <div v-for="toast in toasts" :key="toast.id" 
                     class="bg-slate-800/90 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 backdrop-blur-md pointer-events-auto"
                     :class="{'bg-red-500/90': toast.type === 'error', 'bg-green-500/90': toast.type === 'success'}">
                    <i class="fa-solid" :class="toast.icon"></i>
                    <span class="text-sm font-medium">{{ toast.msg }}</span>
                </div>
            </transition-group>
        </div>

        <!-- 登录框 -->
        <div v-if="showLogin" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="showLogin = false">
            <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-xs">
                <h3 class="text-xl font-bold mb-4 text-center dark:text-white">管理员验证</h3>
                <input type="password" v-model="loginPassword" placeholder="输入密码" class="w-full bg-slate-50 dark:bg-slate-700 border-none dark:text-white p-3 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-blue-500">
                <button @click="doLogin" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-bold transition">登录</button>
            </div>
        </div>

        <!-- 文件夹密码锁 -->
        <div v-if="showFolderLock" class="fixed inset-0 bg-slate-900 flex items-center justify-center z-50 p-4">
            <div class="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center" :class="{ 'shake': lockShake }">
                <i class="fa-solid fa-lock text-4xl text-yellow-500 mb-4"></i>
                <h3 class="text-xl font-bold mb-2 dark:text-white">受保护的文件夹</h3>
                <p class="text-slate-400 text-sm mb-4">该目录已加密，请输入密码访问</p>
                <input ref="lockInput" type="password" v-model="folderPasswordInput" @keyup.enter="unlockFolder" placeholder="输入访问密码" class="w-full border-none bg-slate-50 dark:bg-slate-700 dark:text-white p-3 rounded-xl mb-2 text-center tracking-widest outline-none focus:ring-2 focus:ring-yellow-400 transition" :class="lockError ? 'ring-2 ring-red-500 bg-red-50' : ''">
                <div class="h-6 mb-2">
                    <p v-if="lockError" class="text-red-500 text-xs font-bold"><i class="fa-solid fa-circle-exclamation"></i> {{ lockErrorMsg }}</p>
                </div>
                <button @click="unlockFolder" class="w-full bg-slate-800 dark:bg-slate-600 text-white p-3 rounded-xl font-bold hover:bg-slate-700 transition">解锁并进入</button>
                <button @click="navigate(getParentPath(pendingPath || currentPath))" class="mt-4 text-slate-400 text-sm hover:text-slate-600">返回上一级</button>
            </div>
        </div>

        <!-- 分享弹窗 -->
        <div v-if="showShareModal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="closeShareModal">
            <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-md">
                <div class="flex justify-between items-center mb-4 dark:text-white">
                    <h3 class="text-lg font-bold flex items-center gap-2"><i class="fa-solid fa-link text-blue-500"></i> 分享链接</h3>
                    <button @click="closeShareModal" class="text-slate-400 hover:text-slate-700"><i class="fa-solid fa-xmark text-xl"></i></button>
                </div>
                <div class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-4 flex items-center justify-between">
                    <input type="text" readonly :value="shareUrl" class="bg-transparent w-full text-sm text-slate-600 dark:text-slate-300 outline-none select-all font-mono">
                </div>
                <div class="flex gap-3">
                    <button @click="copyLink" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2"><i class="fa-regular fa-copy"></i> 复制</button>
                    <a :href="shareUrl" target="_blank" class="px-4 py-2.5 bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-xl font-bold hover:bg-blue-100 transition"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
                </div>
            </div>
        </div>

        <!-- 预览弹窗 -->
        <div v-if="previewItem" class="fixed inset-0 bg-black/95 z-50 flex flex-col justify-center items-center" @click.self="previewItem = null">
            <div class="absolute top-0 w-full p-4 flex justify-between items-center text-white/80 bg-gradient-to-b from-black/50 to-transparent">
                <span class="truncate pr-4 max-w-[70%]">{{ previewItem.name }}</span>
            </div>
            <div class="w-full h-full flex items-center justify-center p-2 relative">
                <button v-if="hasPrev" @click.stop="navPreview(-1)" class="absolute left-2 p-4 text-white/50 hover:text-white z-10 bg-black/20 hover:bg-black/40 rounded-full transition"><i class="fa-solid fa-chevron-left text-2xl"></i></button>
                <button v-if="hasNext" @click.stop="navPreview(1)" class="absolute right-2 p-4 text-white/50 hover:text-white z-10 bg-black/20 hover:bg-black/40 rounded-full transition"><i class="fa-solid fa-chevron-right text-2xl"></i></button>
                
                <img v-if="isImage(previewItem.name)" 
                     :src="getFileUrl(previewItem.name, false, true)" 
                     class="max-w-full max-h-full object-contain shadow-2xl preview-click-area"
                     @click.stop="previewItem = null">
                
                <video v-else-if="isVideo(previewItem.name)" 
                       :src="getFileUrl(previewItem.name, false, true)" 
                       controls autoplay class="max-w-full max-h-full preview-click-area"
                       @click.stop="previewItem = null">
                </video>
            </div>
        </div>

    </div>

    <script>
        const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

        createApp({
            setup() {
                const currentPath = ref('/');
                const pendingPath = ref('');
                const files = ref([]);
                const folders = ref([]);
                const loading = ref(false);
                const isAdmin = ref(false);
                const publicDomain = ref('');
                const searchQuery = ref('');
                const uploadProgress = ref(0);
                const isDragging = ref(false);
                const sortType = ref('name'); // 'name' | 'time'
                
                // 存储类型
                const currentStorage = ref('local'); // 'local' | 'onedrive'
                
                // 分页相关
                const pageNum = ref(1);
                const pageCursors = ref([null]); // 索引0对应第1页的输入cursor(null)，索引1对应第2页的输入cursor
                const hasMore = ref(false);

                const showLogin = ref(false);
                const loginPassword = ref('');
                const showFolderLock = ref(false);
                const folderPasswordInput = ref('');
                const folderPasswords = ref(JSON.parse(sessionStorage.getItem('folderPasswords') || '{}'));
                const lockError = ref(false);
                const lockErrorMsg = ref('');
                const lockShake = ref(false);
                const lockInput = ref(null);
                
                const showShareModal = ref(false);
                const shareUrl = ref('');
                const previewItem = ref(null);
                const toasts = ref([]);
                const isDark = ref(false);

                watch(folderPasswords, (newVal) => {
                    sessionStorage.setItem('folderPasswords', JSON.stringify(newVal));
                }, { deep: true });

                const toggleDarkMode = () => {
                    isDark.value = !isDark.value;
                    if(isDark.value) document.documentElement.classList.add('dark');
                    else document.documentElement.classList.remove('dark');
                    localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
                };

                const toggleSort = () => {
                    sortType.value = sortType.value === 'name' ? 'time' : 'name';
                };

                // 切换存储类型
                const switchStorage = (type) => {
                    if (type === currentStorage.value) return;
                    
                    currentStorage.value = type;
                    pageNum.value = 1;
                    pageCursors.value = [null];
                    files.value = []; 
                    folders.value = [];
                    
                    // 立即更新浏览器 URL
                    const newUrl = new URL(window.location);
                    newUrl.searchParams.set('path', '/');
                    if (type !== 'local') {
                        newUrl.searchParams.set('storage', type);
                    } else {
                        newUrl.searchParams.delete('storage');
                    }
                    window.history.pushState(null, '', newUrl.toString());

                    navigate('/');
                };

                onMounted(async () => {
                    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                        toggleDarkMode();
                    }
                    await checkAuth();
                    const urlParams = new URLSearchParams(window.location.search);
                    const initialPath = urlParams.get('path') || '/';
                    const storageParam = urlParams.get('storage');
                    if (storageParam && (storageParam === 'local' || storageParam === 'onedrive')) {
                        currentStorage.value = storageParam;
                    }
                    navigate(initialPath);

                    window.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape' && previewItem.value) previewItem.value = null;
                    });
                });

                const showToast = (msg, type = 'success') => {
                    const id = Date.now();
                    const icon = type === 'success' ? 'fa-circle-check text-green-400' : 'fa-circle-xmark text-red-400';
                    toasts.value.push({ id, msg, type, icon });
                    setTimeout(() => toasts.value = toasts.value.filter(t => t.id !== id), 3000);
                };

                const filteredFiles = computed(() => {
                    let result = files.value || []; // 安全检查
                    if (searchQuery.value) {
                        result = result.filter(f => f.name.toLowerCase().includes(searchQuery.value.toLowerCase()));
                    }
                    if (sortType.value === 'time') {
                        // 时间新到旧
                        return result.slice().sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));
                    }
                    return result;
                });

                const filteredFolders = computed(() => {
                    let list = folders.value || []; // 安全检查
                    if (!searchQuery.value) return list;
                    return list.filter(f => f.name.toLowerCase().includes(searchQuery.value.toLowerCase()));
                });

                const getStoredPassword = (path) => {
                    let temp = path;
                    while(temp && temp !== '/') {
                        if (folderPasswords.value[temp]) return folderPasswords.value[temp];
                        temp = getParentPath(temp);
                    }
                    if (folderPasswords.value['/']) return folderPasswords.value['/'];
                    return '';
                };

                // 分页加载
                const fetchList = async (path, cursor = null) => {
                    loading.value = true;
                    const pwd = getStoredPassword(path);
                    
                    let url = \`/api/list?path=\${encodeURIComponent(path)}&storage=\${currentStorage.value}\`;
                    if (cursor) {
                        url += \`&cursor=\${encodeURIComponent(cursor)}\`;
                    }

                    try {
                        const res = await fetch(url, {
                            headers: { 'X-Folder-Password': pwd }
                        });
                        
                        if (res.status === 401) {
                            if (currentStorage.value === 'onedrive') {
                                showToast('OneDrive 认证失败：请检查后台配置或进行初始授权', 'error');
                            } else {
                                showToast('未授权访问', 'error');
                            }
                            files.value = [];
                            folders.value = [];
                            loading.value = false;
                            return;
                        }

                        if (res.status === 403) {
                            const data = await res.json();
                            if (data.error === 'LOCKED' || data.error === 'LOCKED_PARENT') {
                                pendingPath.value = path;
                                showFolderLock.value = true;
                                lockError.value = false;
                                folderPasswordInput.value = '';
                                nextTick(() => lockInput.value && lockInput.value.focus());
                            } else if (data.error === 'INVALID_PASSWORD') {
                                showFolderLock.value = true;
                                lockError.value = true;
                                lockErrorMsg.value = '密码错误';
                                lockShake.value = true;
                                setTimeout(() => lockShake.value = false, 500);
                                if (folderPasswords.value[path]) delete folderPasswords.value[path];
                            }
                            loading.value = false;
                            return;
                        }
                        
                        if (!res.ok) {
                            throw new Error(\`Status: \${res.status}\`);
                        }

                        const data = await res.json();
                        
                        files.value = data.files || [];
                        folders.value = data.folders || [];
                        
                        if (data.cursor) {
                            pageCursors.value[pageNum.value] = data.cursor; 
                            hasMore.value = true;
                        } else {
                            hasMore.value = false;
                        }

                        currentPath.value = path;
                        pendingPath.value = '';
                        showFolderLock.value = false;
                        
                        // 确保 URL 状态正确
                        const newUrl = new URL(window.location);
                        newUrl.searchParams.set('path', path);
                        if(currentStorage.value !== 'local') {
                            newUrl.searchParams.set('storage', currentStorage.value);
                        } else {
                            newUrl.searchParams.delete('storage');
                        }
                        window.history.replaceState(null, '', newUrl.toString());

                    } catch (e) {
                        console.error(e);
                        showToast('加载失败: ' + e.message, 'error');
                        files.value = [];
                        folders.value = [];
                    } finally {
                        loading.value = false;
                    }
                };

                // 翻页操作
                const changePage = (offset) => {
                    const newPage = pageNum.value + offset;
                    if (newPage < 1) return;
                    
                    const targetCursor = pageCursors.value[newPage - 1];
                    if (offset > 0 && !targetCursor && newPage !== 1) return;

                    pageNum.value = newPage;
                    fetchList(currentPath.value, targetCursor);
                };

                const navigate = (path) => {
                    pageNum.value = 1;
                    pageCursors.value = [null]; 
                    fetchList(path);
                };

                const unlockFolder = () => {
                    if(!folderPasswordInput.value) return;
                    const targetPath = pendingPath.value || currentPath.value;
                    folderPasswords.value[targetPath] = folderPasswordInput.value;
                    navigate(targetPath);
                };

                const compressImage = async (file) => {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = (e) => {
                            const img = new Image();
                            img.src = e.target.result;
                            img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const MAX_WIDTH = 300;
                                const scaleSize = MAX_WIDTH / img.width;
                                canvas.width = MAX_WIDTH;
                                canvas.height = img.height * scaleSize;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.7);
                            };
                        };
                    });
                };

                const handleFiles = async (fileList) => {
                    if (!fileList.length) return;
                    const total = fileList.length;
                    let completed = 0;
                    uploadProgress.value = 1;

                    for (let file of fileList) {
                        try {
                            const formData = new FormData();
                            formData.append('file', file);
                            
                            await fetch(\`/api/upload?storage=\${currentStorage.value}&path=\${encodeURIComponent(currentPath.value)}\`, {
                                method: 'POST',
                                body: formData
                            });

                            if (isImage(file.name) && currentStorage.value === 'local') {
                                const thumbBlob = await compressImage(file);
                                const thumbFormData = new FormData();
                                thumbFormData.append('file', thumbBlob);
                                
                                await fetch(\`/api/upload-thumb?storage=\${currentStorage.value}&path=\${encodeURIComponent(currentPath.value)}&name=\${encodeURIComponent(file.name)}\`, {
                                    method: 'POST',
                                    body: thumbFormData
                                });
                            }
                        } catch(e) { console.error(e); }
                        completed++;
                        uploadProgress.value = Math.round((completed / total) * 100);
                    }
                    
                    showToast(\`成功上传 \${total} 个文件\`);
                    uploadProgress.value = 0;
                    navigate(currentPath.value); // 刷新
                };

                const handleUploadInput = (e) => handleFiles(e.target.files);
                const dragEnter = () => isDragging.value = isAdmin.value;
                const dragLeave = (e) => { if (e.relatedTarget === null) isDragging.value = false; };
                const handleDrop = (e) => { isDragging.value = false; if (!isAdmin.value) return; handleFiles(e.dataTransfer.files); };

                const getFileUrl = (name, thumb = false, usePublic = false) => {
                    if (thumb) {
                        if (currentStorage.value === 'onedrive') {
                            return \`/api/onedrive/thumb?path=\${encodeURIComponent(currentPath.value + name)}\`;
                        }
                        const base = \`/file\${currentPath.value}\${name}\`;
                        return \`\${base}?thumb=true\`;
                    }
                    
                    if (usePublic && publicDomain.value && currentStorage.value === 'local') {
                         const cleanPath = (currentPath.value + name).replace(/^\\/+/g, '');
                         return \`https://\${publicDomain.value}/\${encodeURI(cleanPath)}\`;
                    }
                    
                    if (currentStorage.value === 'onedrive') {
                        return \`/api/onedrive/download?path=\${encodeURIComponent(currentPath.value + name)}\`;
                    }
                    
                    return \`/file\${currentPath.value}\${name}\`;
                };

                const imgError = (e, name) => {
                    if (e.target.getAttribute('data-failed')) return;
                    e.target.setAttribute('data-failed', 'true');
                    if (e.target.src.includes('?thumb=true')) e.target.src = getFileUrl(name, false, true); 
                    else {
                        e.target.style.display = 'none';
                        e.target.parentElement.querySelector('i').classList.remove('hidden');
                    }
                };

                const createFolder = async () => {
                    const name = prompt("文件夹名称");
                    if (!name) return;
                    
                    await fetch(\`/api/create-folder?storage=\${currentStorage.value}&path=\${encodeURIComponent(currentPath.value + name + '/')}\`, {
                        method: 'POST'
                    });
                    navigate(currentPath.value);
                };

                const deleteFile = async (file) => {
                    if (!confirm(\`确定删除 \${file.name} 吗？\`)) return;
                    
                    await fetch(\`/api/delete?storage=\${currentStorage.value}&path=\${encodeURIComponent(currentPath.value + file.name)}\`, {
                        method: 'POST'
                    });
                    showToast('已删除');
                    navigate(currentPath.value);
                };

                const openPreview = (file) => {
                    if (isImage(file.name) || isVideo(file.name)) previewItem.value = file;
                    else window.open(getFileUrl(file.name, false, true), '_blank');
                };
                
                const flatFiles = computed(() => (files.value || []).filter(f => isImage(f.name) || isVideo(f.name)));
                const currentPreviewIdx = computed(() => !previewItem.value ? -1 : flatFiles.value.findIndex(f => f.name === previewItem.value.name));
                const hasPrev = computed(() => currentPreviewIdx.value > 0);
                const hasNext = computed(() => currentPreviewIdx.value < flatFiles.value.length - 1 && currentPreviewIdx.value !== -1);
                
                const navPreview = (delta) => {
                    const newIdx = currentPreviewIdx.value + delta;
                    if(newIdx >= 0 && newIdx < flatFiles.value.length) previewItem.value = flatFiles.value[newIdx];
                };

                const doLogin = async () => {
                    const res = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ password: loginPassword.value }) });
                    if (res.ok) {
                        isAdmin.value = true;
                        showLogin.value = false;
                        loginPassword.value = '';
                        navigate(currentPath.value);
                        showToast('登录成功');
                    } else showToast('密码错误', 'error');
                };
                
                const checkAuth = async () => { 
                    try { 
                        const data = await (await fetch('/api/check-auth')).json();
                        isAdmin.value = data.isAdmin; 
                        publicDomain.value = data.publicDomain || '';
                    } catch(e){} 
                };
                const logout = async () => { await fetch('/api/logout', { method: 'POST' }); window.location.reload(); };
                
                // === 修复: 设置密码时带上 storage 参数 ===
                const setFolderPassword = async () => {
                    const pwd = prompt("设置当前目录密码 (留空取消)");
                    if (pwd === null) return;
                    await fetch(\`/api/config?storage=\${currentStorage.value}\`, {
                        method: 'POST',
                        body: JSON.stringify({ type: 'lock', path: currentPath.value, password: pwd })
                    });
                    showToast(pwd ? "已加密" : "已取消加密");
                };

                // === 修复: 切换隐藏时带上 storage 参数 ===
                const toggleHiddenFolder = async () => {
                    const confirmHide = confirm("切换当前文件夹的隐藏状态？(隐藏后游客不可见)");
                    if (!confirmHide) return;
                    await fetch(\`/api/config?storage=\${currentStorage.value}\`, {
                        method: 'POST',
                        body: JSON.stringify({ type: 'hide', path: currentPath.value })
                    });
                    showToast("状态已更新");
                    navigate(currentPath.value); // 刷新
                };

                const openShareModal = async (itemName, isFolder) => {
                    let finalUrl = '';
                    const fullPath = currentPath.value + itemName;
                    if (isFolder) {
                        const url = new URL(window.location.origin);
                        url.searchParams.set('path', fullPath + '/');
                        url.searchParams.set('storage', currentStorage.value);
                        finalUrl = url.toString();
                    } else {
                        const pwd = getStoredPassword(currentPath.value);
                        const res = await fetch(\`/api/get-link?storage=\${currentStorage.value}\`, {
                            method: 'POST',
                            headers: { 'X-Folder-Password': pwd },
                            body: JSON.stringify({ path: fullPath })
                        });
                        if (res.status === 403) {
                             showToast('无法生成链接', 'error');
                             return;
                        }
                        const data = await res.json();
                        finalUrl = data.url;
                    }
                    shareUrl.value = finalUrl;
                    showShareModal.value = true;
                };
                const closeShareModal = () => showShareModal.value = false;
                const copyLink = () => { navigator.clipboard.writeText(shareUrl.value); showToast('链接已复制'); };
                
                const getParentPath = (path) => {
                     if (path === '/' || !path) return '/';
                     const clean = path.endsWith('/') ? path.slice(0, -1) : path;
                     const lastSlash = clean.lastIndexOf('/');
                     if (lastSlash <= 0) return '/';
                     return clean.slice(0, lastSlash) + '/';
                };
                
                const breadcrumbs = computed(() => {
                    if (currentPath.value === '/') return [];
                    const parts = currentPath.value.split('/').filter(p => p);
                    let pathAccum = '';
                    return parts.map(p => { pathAccum += '/' + p; return { name: p, path: pathAccum + '/' }; });
                });
                const isImage = (n) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(n);
                const isVideo = (n) => /\.(mp4|mov|webm|avi)$/i.test(n);
                const getFileIcon = (name) => {
                    const ext = name.split('.').pop().toLowerCase();
                    const map = {
                        pdf: 'fa-file-pdf text-red-500', doc: 'fa-file-word text-blue-500', docx: 'fa-file-word text-blue-500',
                        xls: 'fa-file-excel text-green-500', xlsx: 'fa-file-excel text-green-500',
                        zip: 'fa-file-zipper text-orange-500', rar: 'fa-file-zipper text-orange-500',
                        mp3: 'fa-file-audio text-yellow-500', txt: 'fa-file-lines text-slate-500'
                    };
                    return map[ext] || 'fa-solid fa-file text-slate-400';
                };
                const formatSize = (bytes) => {
                    if (bytes === 0) return '0 B';
                    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                };
                const formatDate = (dateStr) => {
                    if (!dateStr) return '';
                    const d = new Date(dateStr);
                    return d.getFullYear() + '/' + (d.getMonth()+1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + d.getMinutes();
                };

                return {
                    currentPath, pendingPath, filteredFiles, filteredFolders, breadcrumbs, loading, isAdmin, searchQuery,
                    showLogin, loginPassword, doLogin, logout,
                    showFolderLock, folderPasswordInput, unlockFolder, lockError, lockErrorMsg, lockShake, lockInput,
                    uploadProgress, handleUploadInput, isDragging, dragEnter, dragLeave, handleDrop,
                    createFolder, deleteFile, setFolderPassword, toggleHiddenFolder,
                    showShareModal, openShareModal, closeShareModal, shareUrl, copyLink,
                    previewItem, openPreview, navPreview, hasPrev, hasNext,
                    getFileIcon, formatSize, formatDate, navigate, getParentPath, getFileUrl, imgError, isImage, isVideo,
                    toasts, toggleDarkMode, isDark,
                    pageNum, changePage, hasMore,
                    sortType, toggleSort,
                    currentStorage, switchStorage
                };
            }
        }).mount('#app');
    </script>
</body>
</html>
`;

// ============================================================================
// Worker 处理逻辑
// ============================================================================

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        if (method === 'GET' && (path === '/' || path === '/index.html' || path.startsWith('/file/'))) {
             return fetchAndCache(request, env, ctx, () => handleGetRequest(request, env, path));
        }
        
        return handleApiRequest(request, env, path);
    }
};

async function handleGetRequest(request, env, path) {
    if (path === '/' || path === '/index.html') {
        return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }

    if (path.startsWith('/file/')) {
        const rawPath = decodeURIComponent(path.replace('/file', ''));
        if (rawPath.includes('/.sys/') || rawPath.startsWith('/.sys/')) {
             return new Response('Access Denied', { status: 403 });
        }

        const url = new URL(request.url);
        const isThumb = url.searchParams.get('thumb') === 'true';
        let r2Key = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
        
        if (isThumb) {
            r2Key = `${THUMB_PREFIX}/${r2Key}`; 
            r2Key = r2Key.replace('thumbs//', 'thumbs/'); 
        }

        let object = await env.MY_BUCKET.get(r2Key);
        if (!object && isThumb) return new Response('Thumb Not Found', { status: 404 });
        if (!object) return new Response('Not Found', { status: 404 });
        
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        
        return new Response(object.body, { headers });
    }
    
    return new Response('Not Found', { status: 404 });
}

async function handleApiRequest(request, env, path) {
    const url = new URL(request.url);
    const method = request.method;
    const isAdmin = await checkAdmin(request, env);
    const storage = url.searchParams.get('storage') || 'local';

    // ------------------------------------------------
    // OneDrive 授权路由
    // ------------------------------------------------
    if (path === '/api/onedrive/login') {
        if (!env.ONEDRIVE_CLIENT_ID || !env.ONEDRIVE_REDIRECT_URI) return new Response('Missing OneDrive Config', { status: 500 });
        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${env.ONEDRIVE_CLIENT_ID}&scope=Files.ReadWrite.All offline_access&response_type=code&redirect_uri=${encodeURIComponent(env.ONEDRIVE_REDIRECT_URI)}`;
        return Response.redirect(authUrl, 302);
    }
    if (path === '/api/onedrive/callback') {
        const code = url.searchParams.get('code');
        if (!code) return new Response('Missing Code', { status: 400 });
        return await exchangeOneDriveToken(env, code);
    }

    // ------------------------------------------------
    // OneDrive 下载/缩略图路由
    // ------------------------------------------------
    if (path.startsWith('/api/onedrive/')) {
        return handleOneDriveRequest(request, env, path, isAdmin);
    }

    if (path.startsWith('/api/')) {
        
        // 获取分享链接
        if (path === '/api/get-link' && method === 'POST') {
            const body = await request.json();
            
            if (!isAdmin) {
                const config = await getConfig(env);
                const checkPath = `${storage}:${body.path}`;
                const lockInfo = getEffectiveLock(checkPath, config.locks);
                if (lockInfo) {
                    const providedPwd = request.headers.get('X-Folder-Password');
                    if (providedPwd !== lockInfo.password) return new Response(JSON.stringify({ url: 'Protected Content' }), { status: 403 });
                }
            }
            
            let finalUrl;
            if (storage === 'onedrive') {
                finalUrl = `${url.origin}/api/onedrive/download?path=${encodeURIComponent(body.path)}`;
            } else {
                const r2Key = body.path.startsWith('/') ? body.path.slice(1) : body.path;
                finalUrl = env.PUBLIC_DOMAIN 
                    ? `https://${env.PUBLIC_DOMAIN}/${encodeURI(r2Key)}` 
                    : `${url.origin}/file${body.path}`;
            }
            return new Response(JSON.stringify({ url: finalUrl }));
        }

        // 获取文件列表 (List)
        if (path === '/api/list') {
            let reqPath = url.searchParams.get('path') || '/';
            // 规范化路径：确保以 / 开头，如果是目录则以 / 结尾
            if (!reqPath.startsWith('/')) reqPath = '/' + reqPath;
            if (!reqPath.endsWith('/')) reqPath = reqPath + '/';

            const cursor = url.searchParams.get('cursor'); 
            const config = await getConfig(env);

            const checkPath = `${storage}:${reqPath}`;

            if (!isAdmin) {
                const lockInfo = getEffectiveLock(checkPath, config.locks);
                if (lockInfo) {
                    const providedPwd = request.headers.get('X-Folder-Password');
                    if (!providedPwd) return new Response(JSON.stringify({ error: 'LOCKED' }), { status: 403 });
                    if (providedPwd !== lockInfo.password) return new Response(JSON.stringify({ error: 'INVALID_PASSWORD' }), { status: 403 });
                }
            }

            // OneDrive 分支
            if (storage === 'onedrive') {
                return await getOneDriveList(env, reqPath, cursor, config, isAdmin, storage);
            }
            
            // Local 分支
            if (reqPath.startsWith('/.sys')) return new Response(JSON.stringify({ error: 'FORBIDDEN' }), { status: 403 });
            
            const r2Prefix = reqPath === '/' ? '' : reqPath.slice(1);
            const options = { prefix: r2Prefix, delimiter: '/', limit: PAGE_SIZE };
            if (cursor) options.cursor = cursor;

            const list = await env.MY_BUCKET.list(options);
            
            let folders = list.delimitedPrefixes.map(p => {
                const fullPath = '/' + p;
                const checkHiddenPath = `${storage}:${fullPath}`;
                const isHidden = config.hidden && config.hidden[checkHiddenPath];
                return { 
                    name: p.replace(r2Prefix, '').replace(/\/$/, ''), 
                    path: fullPath,
                    hidden: !!isHidden 
                };
            }).filter(f => !f.name.startsWith('.sys') && !f.name.startsWith('.'));

            let files = list.objects.map(o => ({ 
                name: o.key.replace(r2Prefix, ''), 
                size: o.size,
                uploaded: o.uploaded 
            })).filter(f => !f.name.startsWith('.') && f.name !== '');

            // 过滤隐藏
            if (!isAdmin) {
                if (isPathHidden(checkPath, config.hidden)) return new Response(JSON.stringify({ error: 'NOT_FOUND' }), { status: 404 });
                folders = folders.filter(f => !f.hidden);
            }

            return new Response(JSON.stringify({ 
                folders, 
                files,
                cursor: list.truncated ? list.cursor : null 
            }));
        }
        
        // 鉴权相关
        if (path === '/api/login') {
            const { password } = await request.json();
            if (password === env.ADMIN_PASSWORD) {
                return new Response('OK', { headers: { 'Set-Cookie': `auth=${env.ADMIN_PASSWORD}; Max-Age=86400; Path=/; HttpOnly` }});
            }
            return new Response('Unauthorized', { status: 401 });
        }
        if (path === '/api/logout') return new Response('OK', { headers: { 'Set-Cookie': 'auth=; Max-Age=0; Path=/' }});
        if (path === '/api/check-auth') return new Response(JSON.stringify({ isAdmin, publicDomain: env.PUBLIC_DOMAIN || '' }));

        if (!isAdmin) return new Response('Admin only', { status: 401 });

        // 上传等操作
        if (path === '/api/upload') {
            const formData = await request.formData();
            const file = formData.get('file');
            const folderPath = url.searchParams.get('path') || '/';
            if (storage === 'onedrive') return await uploadToOneDrive(env, folderPath, file);
            await env.MY_BUCKET.put((folderPath + file.name).slice(1), file);
            return new Response('OK');
        }
        
        // 缩略图
        if (path === '/api/upload-thumb') {
            const formData = await request.formData();
            const file = formData.get('file');
            const folderPath = url.searchParams.get('path') || '/';
            const fileName = url.searchParams.get('name');
            if (storage === 'onedrive') return new Response('OK'); 
            await env.MY_BUCKET.put(`${THUMB_PREFIX}${folderPath}${fileName}`, file); 
            return new Response('OK');
        }

        if (path === '/api/delete') {
            const target = url.searchParams.get('path');
            if (storage === 'onedrive') return await deleteFromOneDrive(env, target);
            const r2Key = target.startsWith('/') ? target.slice(1) : target;
            await env.MY_BUCKET.delete(r2Key);
            try { await env.MY_BUCKET.delete(`${THUMB_PREFIX}${target}`); } catch(e) {}
            return new Response('OK');
        }

        if (path === '/api/create-folder') {
            const folderPath = url.searchParams.get('path') || '/';
            if (storage === 'onedrive') return await createFolderInOneDrive(env, folderPath);
            await env.MY_BUCKET.put(folderPath.slice(1), new Uint8Array(0));
            return new Response('OK');
        }

        // 配置 (加密/隐藏)
        if (path === '/api/config') {
            const body = await request.json();
            const config = await getConfig(env);
            
            // 修复: 确保路径标准化，防止前后端不一致
            let targetPath = body.path;
            if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;
            if (!targetPath.endsWith('/')) targetPath = targetPath + '/';

            const dbKey = `${storage}:${targetPath}`;
            
            if (body.type === 'lock') {
                if (body.password) config.locks[dbKey] = body.password;
                else delete config.locks[dbKey];
            } else if (body.type === 'hide') {
                if (config.hidden && config.hidden[dbKey]) delete config.hidden[dbKey];
                else {
                    if (!config.hidden) config.hidden = {};
                    config.hidden[dbKey] = true;
                }
            }
            await saveConfig(env, config);
            return new Response('OK');
        }
    }
    return new Response('Not Found', { status: 404 });
}

// ============================================================================
// OneDrive 辅助函数
// ============================================================================

async function handleOneDriveRequest(request, env, path, isAdmin) {
    const url = new URL(request.url);
    const accessToken = await getOneDriveAccessToken(env);
    
    if (!accessToken) {
        return new Response('OneDrive Auth Failed. Please visit /api/onedrive/login', { status: 401 });
    }

    const filePath = url.searchParams.get('path');
    if (!filePath) return new Response('Missing path', { status: 400 });

    // --- 安全检查 ---
    if (!isAdmin) {
        const config = await getConfig(env);
        // 获取文件所在目录
        const parts = filePath.split('/');
        parts.pop(); // 移除文件名
        let parentPath = parts.join('/') + '/'; 
        if (!parentPath.startsWith('/')) parentPath = '/' + parentPath; // 确保以 / 开头

        const checkPath = `onedrive:${parentPath}`;
        
        const lockInfo = getEffectiveLock(checkPath, config.locks);
        if (lockInfo) {
            return new Response('Access Denied: Protected Folder', { status: 403 });
        }
    }

    if (path === '/api/onedrive/download') {
        try {
            const itemResponse = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:${encodeURIComponent(filePath)}:/content`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            return itemResponse;
        } catch (error) {
            return new Response(`Error: ${error.message}`, { status: 500 });
        }
    }
    
    if (path === '/api/onedrive/thumb') {
        try {
            const thumbResponse = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:${encodeURIComponent(filePath)}:/thumbnails/0/medium/content`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if(thumbResponse.ok) return thumbResponse;
            return new Response('Thumb not found', { status: 404 });
        } catch (error) {
            return new Response('Error', { status: 500 });
        }
    }
    return new Response('Not Found', { status: 404 });
}

async function getOneDriveList(env, path, cursor, config, isAdmin, storage) {
    const accessToken = await getOneDriveAccessToken(env);
    if (!accessToken) return new Response(JSON.stringify({ error: 'AUTH_REQUIRED' }), { status: 401 });

    try {
        let apiUrl;
        const selectFields = 'select=name,size,lastModifiedDateTime,folder,file,id,@microsoft.graph.downloadUrl';
        
        const cleanPath = (path !== '/' && path.endsWith('/')) ? path.slice(0, -1) : path;

        if (cleanPath === '/') {
            apiUrl = `https://graph.microsoft.com/v1.0/me/drive/root/children?${selectFields}&$top=${PAGE_SIZE}`;
        } else {
            apiUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${encodeURIComponent(cleanPath)}:/children?${selectFields}&$top=${PAGE_SIZE}`;
        }
        
        if (cursor) apiUrl += `&$skiptoken=${encodeURIComponent(cursor)}`;

        const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Error ${response.status}: ${errText}`);
        }
        
        const data = await response.json();
        
        let folders = [];
        const files = [];

        for (const item of data.value) {
            if (item.folder) {
                const folderPath = path === '/' ? `/${item.name}/` : `${path}${item.name}/`;
                const checkHiddenPath = `${storage}:${folderPath}`;
                const isHidden = config && config.hidden && config.hidden[checkHiddenPath];
                
                folders.push({
                    name: item.name,
                    path: folderPath,
                    hidden: !!isHidden
                });
            } else {
                files.push({
                    name: item.name,
                    size: item.size || 0,
                    uploaded: item.lastModifiedDateTime,
                    downloadUrl: item['@microsoft.graph.downloadUrl']
                });
            }
        }

        if (!isAdmin) {
            const currentCheckPath = `${storage}:${path}`;
            if (config && isPathHidden(currentCheckPath, config.hidden)) {
                return new Response(JSON.stringify({ error: 'NOT_FOUND' }), { status: 404 });
            }
            folders = folders.filter(f => !f.hidden);
        }

        return new Response(JSON.stringify({
            folders,
            files,
            cursor: data['@odata.nextLink'] ? new URL(data['@odata.nextLink']).searchParams.get('$skiptoken') : null
        }));
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

async function getOneDriveAccessToken(env) {
    try {
        const tokenObj = await env.MY_BUCKET.get('.sys/onedrive_token.json');
        if (!tokenObj) return null;

        const tokenData = await tokenObj.json();
        
        if (tokenData.expires_at && Date.now() < (tokenData.expires_at - 300 * 1000)) {
            return tokenData.access_token;
        }

        console.log('Refreshing OneDrive Token...');
        const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: env.ONEDRIVE_CLIENT_ID,
                client_secret: env.ONEDRIVE_CLIENT_SECRET,
                refresh_token: tokenData.refresh_token,
                grant_type: 'refresh_token',
                redirect_uri: env.ONEDRIVE_REDIRECT_URI
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error_description || data.error);

        const newToken = {
            access_token: data.access_token,
            refresh_token: data.refresh_token, 
            expires_at: Date.now() + (data.expires_in * 1000)
        };
        await env.MY_BUCKET.put('.sys/onedrive_token.json', JSON.stringify(newToken));
        
        return data.access_token;

    } catch (error) {
        console.error('OneDrive Token Error:', error);
        return null;
    }
}

async function exchangeOneDriveToken(env, code) {
    try {
        const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: env.ONEDRIVE_CLIENT_ID,
                client_secret: env.ONEDRIVE_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: env.ONEDRIVE_REDIRECT_URI
            })
        });

        const data = await response.json();
        if (data.error) return new Response(`Auth Error: ${JSON.stringify(data)}`, { status: 400 });

        const token = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: Date.now() + (data.expires_in * 1000)
        };

        await env.MY_BUCKET.put('.sys/onedrive_token.json', JSON.stringify(token));
        
        return new Response('<h1>OneDrive 授权成功！</h1><p>Token 已保存。你可以关闭此页面并刷新网盘首页。</p>', { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
    } catch (e) {
        return new Response(`Error: ${e.message}`, { status: 500 });
    }
}

async function uploadToOneDrive(env, folderPath, file) {
    const accessToken = await getOneDriveAccessToken(env);
    if (!accessToken) return new Response('Unauthorized', { status: 401 });

    const uploadUrl = folderPath === '/' 
        ? `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(file.name)}:/content`
        : `https://graph.microsoft.com/v1.0/me/drive/root:${encodeURIComponent(folderPath)}${encodeURIComponent(file.name)}:/content`;

    const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
    });

    return response.ok ? new Response('OK') : new Response('Upload Failed', { status: 500 });
}

async function deleteFromOneDrive(env, filePath) {
    const accessToken = await getOneDriveAccessToken(env);
    if (!accessToken) return new Response('Unauthorized', { status: 401 });

    const deleteUrl = `https://graph.microsoft.com/v1.0/me/drive/root:${encodeURIComponent(filePath)}`;
    const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    return response.ok ? new Response('OK') : new Response('Delete Failed', { status: 500 });
}

async function createFolderInOneDrive(env, folderPath) {
    const accessToken = await getOneDriveAccessToken(env);
    if (!accessToken) return new Response('Unauthorized', { status: 401 });

    const parts = folderPath.split('/').filter(p => p);
    const folderName = parts[parts.length - 1];
    const parentPath = '/' + parts.slice(0, -1).join('/') + '/';

    const createUrl = parentPath === '/'
        ? `https://graph.microsoft.com/v1.0/me/drive/root/children`
        : `https://graph.microsoft.com/v1.0/me/drive/root:${encodeURIComponent(parentPath)}:/children`;

    const response = await fetch(createUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: folderName,
            folder: {},
            "@microsoft.graph.conflictBehavior": "rename"
        })
    });
    return response.ok ? new Response('OK') : new Response('Create Folder Failed', { status: 500 });
}

// ============================================================================
// 通用辅助函数
// ============================================================================

async function fetchAndCache(request, env, ctx, fetcher) {
    const cache = caches.default;
    const cacheKey = new Request(request.url, request); 
    let response = await cache.match(cacheKey);
    if (response) return response;
    response = await fetcher();
    if (response.status === 200) {
        const headers = new Headers(response.headers);
        headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        response = new Response(response.body, { ...response, headers });
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }
    return response;
}

async function checkAdmin(req, env) { 
    const cookie = req.headers.get('Cookie') || ''; 
    return cookie.includes(`auth=${env.ADMIN_PASSWORD}`); 
}

async function getConfig(env) { 
    const obj = await env.MY_BUCKET.get(CONFIG_PATH); 
    if (!obj) return { locks: {}, hidden: {} };
    const json = await obj.json();
    return { locks: json.locks || {}, hidden: json.hidden || {} };
}

async function saveConfig(env, config) { 
    await env.MY_BUCKET.put(CONFIG_PATH, JSON.stringify(config)); 
}

// 递归检查锁
function getEffectiveLock(fullPath, locks) {
    if (!locks) return null;
    
    // 1. 直接检查当前路径
    if (locks[fullPath]) return { path: fullPath, password: locks[fullPath] };
    
    // 2. 递归检查父目录
    const splitIndex = fullPath.indexOf(':');
    if (splitIndex === -1) return null; 

    const storagePrefix = fullPath.substring(0, splitIndex + 1); // "local:" or "onedrive:"
    const pathPart = fullPath.substring(splitIndex + 1); // "/a/b/c/"
    
    let parts = pathPart.split('/').filter(p => p);
    let current = '';
    
    // 检查每一级父目录
    for (const part of parts) {
        current += '/' + part + '/';
        const checkKey = storagePrefix + current;
        if ((storagePrefix + current) !== fullPath && locks[checkKey]) {
            return { path: checkKey, password: locks[checkKey] };
        }
    }
    
    // 3. 检查根目录锁
    const rootKey = storagePrefix + '/';
    if (pathPart !== '/' && locks[rootKey]) {
        return { path: rootKey, password: locks[rootKey] };
    }
    
    return null;
}

function isPathHidden(fullPath, hiddenConfig) {
    if (!hiddenConfig) return false;
    if (hiddenConfig[fullPath]) return true;
    return false;
}