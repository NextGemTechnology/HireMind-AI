import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { MilkyWay3DCanvas } from '../components/MilkyWay3DCanvas';
import {
  Plus,
  ExternalLink,
  GitBranch,
  Trash2,
  Edit3,
  X,
  FolderGit2,
  AlertCircle,
  FileText,
  UploadCloud,
  CheckCircle2,
  Briefcase,
  Cpu,
  MapPin,
  Calendar,
  Sparkles,
  Download,
  Building2,
  GraduationCap,
  Award,
  BookOpen,
  Search,
  Loader2,
} from 'lucide-react';
import '../css/portfolio-builder.css';

// ── Data Interfaces ──────────────────────────────────────────
interface PortfolioItem {
  id: number;
  candidateId?: number;
  title: string;
  description: string;
  category: string;
  projectUrl?: string;
  githubUrl?: string;
  thumbnailUrl?: string;
  viewsCount: number;
  likesCount: number;
  featured?: boolean;
}

interface CandidateSkill {
  id: number;
  skillName: string;
  proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  years?: number;
  primary?: boolean;
}

interface CandidateExperience {
  id: number;
  company: string;
  title: string;
  description?: string;
  location?: string;
  employmentType?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
}

interface CandidateEducation {
  id?: number;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  gpa?: number | string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  displayOrder?: number;
}

interface ResumeItem {
  id: number;
  fileName: string;
  fileSize?: number;
  versionName?: string;
  active?: boolean;
  createdAt?: string;
}

interface CandidateProfile {
  id?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  headline?: string;
  bio?: string;
  location?: string;
  currentTitle?: string;
  currentCompany?: string;
  yearsExperience?: number;
  githubUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  profileCompletion?: number;
  skills?: CandidateSkill[];
  experiences?: CandidateExperience[];
  educations?: CandidateEducation[];
}

// ── Categorized Skills Matrix for Quick Selection & Dropdown Search ───
interface SkillCategoryGroup {
  category: string;
  skills: string[];
}

const CATEGORIZED_SKILLS: SkillCategoryGroup[] = [
  {
    category: 'Core Programming Languages',
    skills: [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#',
      'PHP', 'Swift', 'Kotlin', 'Ruby', 'SQL', 'HTML5/CSS3', 'Shell/Bash', 'Scala', 'Dart', 'R'
    ]
  },
  {
    category: 'Frameworks & Web Engineering',
    skills: [
      'React', 'Next.js', 'Vue.js', 'Angular', 'Node.js', 'Express',
      'Spring Boot', 'Django', 'FastAPI', 'Flask', 'Laravel', 'ASP.NET Core',
      'Flutter', 'React Native', 'Tailwind CSS', 'Redux Toolkit', 'GraphQL', 'NestJS', 'Svelte'
    ]
  },
  {
    category: 'Databases & Distributed Storage',
    skills: [
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra',
      'DynamoDB', 'Supabase', 'Firebase', 'Oracle DB', 'MSSQL', 'Neo4j', 'Prisma ORM'
    ]
  },
  {
    category: 'Cloud, DevOps & Microservices',
    skills: [
      'Docker', 'Kubernetes', 'AWS', 'Google Cloud (GCP)', 'Microsoft Azure',
      'Apache Kafka', 'CI/CD Pipelines', 'Terraform', 'Linux', 'Microservices',
      'RESTful APIs', 'Nginx', 'RabbitMQ', 'Git / GitHub Actions'
    ]
  },
  {
    category: 'AI / ML & Data Engineering',
    skills: [
      'Generative AI / LLMs', 'LangChain', 'OpenAI API', 'TensorFlow', 'PyTorch',
      'Prompt Engineering', 'Pandas & NumPy', 'Scikit-Learn', 'Vector DBs (Pinecone)',
      'Hugging Face', 'Data Pipelines & ETL'
    ]
  }
];

type TabType = 'projects' | 'skills' | 'experience' | 'qualifications' | 'resume';

interface PortfolioBuilderProps {
  embedded?: boolean;
}

export const PortfolioBuilder: React.FC<PortfolioBuilderProps> = ({ embedded = false }) => {
  const { user } = useAuth();
  const { isLight } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('projects');

  // Candidate Data State
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [skills, setSkills] = useState<CandidateSkill[]>([]);
  const [experiences, setExperiences] = useState<CandidateExperience[]>([]);
  const [educations, setEducations] = useState<CandidateEducation[]>([]);
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Skills Matrix Search & Category Dropdown State ──
  const [skillCategoryFilter, setSkillCategoryFilter] = useState('ALL');
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [dropdownSelectedSkill, setDropdownSelectedSkill] = useState('');
  const [quickProficiency, setQuickProficiency] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'>('ADVANCED');
  const [quickYears, setQuickYears] = useState<number>(2);
  const [showSkillSearchDropdown, setShowSkillSearchDropdown] = useState(false);
  const skillSearchRef = useRef<HTMLDivElement | null>(null);

  // ── Project Modal State ──
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectCategory, setProjectCategory] = useState('WEB');
  const [projectUrl, setProjectUrl] = useState('');
  const [projectGithub, setProjectGithub] = useState('');
  const [projectThumb, setProjectThumb] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  // ── Skill Modal State ──
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [skillNameInput, setSkillNameInput] = useState('');
  const [skillProficiency, setSkillProficiency] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'>('ADVANCED');
  const [skillYears, setSkillYears] = useState<number>(3);
  const [savingSkill, setSavingSkill] = useState(false);

  // ── Experience Modal State ──
  const [showExpModal, setShowExpModal] = useState(false);
  const [expCompany, setExpCompany] = useState('');
  const [expTitle, setExpTitle] = useState('');
  const [expLocation, setExpLocation] = useState('');
  const [expStartDate, setExpStartDate] = useState('');
  const [expEndDate, setExpEndDate] = useState('');
  const [expCurrent, setExpCurrent] = useState(false);
  const [expDescription, setExpDescription] = useState('');
  const [savingExp, setSavingExp] = useState(false);

  // ── Education / Qualification Modal State ──
  const [showEduModal, setShowEduModal] = useState(false);
  const [editingEduId, setEditingEduId] = useState<number | null>(null);
  const [eduCategory, setEduCategory] = useState<'MASTERS' | 'BACHELORS' | 'TWELFTH' | 'TENTH' | 'DIPLOMA' | 'OTHER'>('BACHELORS');
  const [eduInstitution, setEduInstitution] = useState('');
  const [eduDegree, setEduDegree] = useState('');
  const [eduFieldOfStudy, setEduFieldOfStudy] = useState('');
  const [eduGpa, setEduGpa] = useState('');
  const [eduStartDate, setEduStartDate] = useState('');
  const [eduEndDate, setEduEndDate] = useState('');
  const [eduCurrent, setEduCurrent] = useState(false);
  const [eduDescription, setEduDescription] = useState('');
  const [savingEdu, setSavingEdu] = useState(false);

  // Debounced Institution Search Autocomplete
  const [institutionSuggestions, setInstitutionSuggestions] = useState<string[]>([]);
  const [isSearchingInstitutions, setIsSearchingInstitutions] = useState(false);
  const [showInstitutionDropdown, setShowInstitutionDropdown] = useState(false);
  const institutionCacheRef = useRef<Map<string, string[]>>(new Map());
  const debounceTimerRef = useRef<any>(null);

  // ── Profile Edit Modal State ──
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editHeadline, setEditHeadline] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editCurrentTitle, setEditCurrentTitle] = useState('');
  const [editCurrentCompany, setEditCurrentCompany] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editYearsExp, setEditYearsExp] = useState<number>(0);
  const [editGithub, setEditGithub] = useState('');
  const [editLinkedin, setEditLinkedin] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Resume Upload State ──
  const [uploadingResume, setUploadingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchAllData();
  }, [user]);

  // Click outside listener for skills search autocomplete
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (skillSearchRef.current && !skillSearchRef.current.contains(event.target as Node)) {
        setShowSkillSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Fetch All Candidate Portfolio & Profile Data ──────────
  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Candidate Profile & Skills & Experiences & Educations
      try {
        const profRes = await apiClient.get('/candidates/me');
        const profData = profRes.data?.data || profRes.data;
        if (profData) {
          setProfile(profData);
          setSkills(profData.skills || []);
          setExperiences(profData.experiences || []);
          setEducations(profData.educations || []);
          setEditHeadline(profData.headline || '');
          setEditBio(profData.bio || '');
          setEditCurrentTitle(profData.currentTitle || '');
          setEditCurrentCompany(profData.currentCompany || '');
          setEditLocation(profData.location || '');
          setEditYearsExp(profData.yearsExperience || 0);
          setEditGithub(profData.githubUrl || '');
          setEditLinkedin(profData.linkedinUrl || '');
        }
      } catch (e) {
        console.warn('Candidate profile lookup fallback:', e);
      }

      // 2. Fetch Candidate's Own Projects (Isolated to Current User)
      try {
        const projRes = await apiClient.get('/portfolios/my');
        const projItems = projRes.data?.content || projRes.data?.data?.content || projRes.data?.data || [];
        setPortfolios(Array.isArray(projItems) ? projItems : []);
      } catch (e) {
        setPortfolios([]);
      }

      // 3. Fetch Candidate's Uploaded Resumes
      try {
        const resRes = await apiClient.get('/resumes');
        const resList = resRes.data?.data || resRes.data || [];
        setResumes(Array.isArray(resList) ? resList : []);
      } catch (e) {
        setResumes([]);
      }
    } catch (err: any) {
      console.warn('Error loading portfolio data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Flash Toast Notification ──────────────────────────────
  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // ── Debounced Institution Autocomplete Search ─────────────
  const handleInstitutionChange = (val: string) => {
    setEduInstitution(val);
    if (!val || val.trim().length < 2) {
      setInstitutionSuggestions([]);
      setShowInstitutionDropdown(false);
      return;
    }

    const trimmed = val.trim().toLowerCase();

    // Check memory cache first
    if (institutionCacheRef.current.has(trimmed)) {
      setInstitutionSuggestions(institutionCacheRef.current.get(trimmed)!);
      setShowInstitutionDropdown(true);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsSearchingInstitutions(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get('/candidates/institutions/search', {
          params: { q: val.trim() }
        });
        const list: string[] = res.data?.data || [];
        institutionCacheRef.current.set(trimmed, list);
        setInstitutionSuggestions(list);
        setShowInstitutionDropdown(list.length > 0);
      } catch (err) {
        console.warn('Institution search error:', err);
      } finally {
        setIsSearchingInstitutions(false);
      }
    }, 300);
  };

  const handleSelectInstitution = (inst: string) => {
    setEduInstitution(inst);
    setShowInstitutionDropdown(false);
  };

  // ── PROJECTS CRUD (Permanent MySQL Persistence) ────────────
  const openCreateProjectModal = () => {
    setEditingProjectId(null);
    setProjectTitle('');
    setProjectDesc('');
    setProjectCategory('WEB');
    setProjectUrl('');
    setProjectGithub('');
    setProjectThumb('');
    setShowProjectModal(true);
  };

  const openEditProjectModal = (item: PortfolioItem) => {
    setEditingProjectId(item.id);
    setProjectTitle(item.title || '');
    setProjectDesc(item.description || '');
    setProjectCategory(item.category || 'WEB');
    setProjectUrl(item.projectUrl || '');
    setProjectGithub(item.githubUrl || '');
    setProjectThumb(item.thumbnailUrl || '');
    setShowProjectModal(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) return;

    setSavingProject(true);
    setError('');
    try {
      const payload = {
        title: projectTitle.trim(),
        description: projectDesc.trim(),
        category: projectCategory,
        projectUrl: projectUrl.trim() || undefined,
        githubUrl: projectGithub.trim() || undefined,
        thumbnailUrl: projectThumb.trim() || undefined,
      };

      if (editingProjectId) {
        const res = await apiClient.put(`/portfolios/${editingProjectId}`, payload);
        const updatedItem = res.data?.data || res.data;
        setPortfolios((prev) =>
          prev.map((item) => (item.id === editingProjectId ? { ...item, ...updatedItem } : item))
        );
        showToast('✨ Project showcase updated successfully!');
      } else {
        const res = await apiClient.post('/portfolios', payload);
        const newItem = res.data?.data || res.data;
        setPortfolios((prev) => [newItem, ...prev]);
        showToast('🚀 New project showcase published!');
      }

      setShowProjectModal(false);
    } catch (err: any) {
      console.error('Error saving project:', err);
      setError(err?.response?.data?.message || 'Failed to save project showcase.');
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('Are you sure you want to remove this project from your portfolio?')) return;
    try {
      await apiClient.delete(`/portfolios/${projectId}`);
      setPortfolios((prev) => prev.filter((p) => p.id !== projectId));
      showToast('Project removed.');
    } catch (err: any) {
      console.error('Failed to delete project:', err);
      setPortfolios((prev) => prev.filter((p) => p.id !== projectId));
      showToast('Project removed.');
    }
  };

  // ── SKILLS CRUD ───────────────────────────────────────────
  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillNameInput.trim()) return;

    setSavingSkill(true);
    setError('');
    try {
      const payload = {
        skillName: skillNameInput.trim(),
        proficiency: skillProficiency,
        years: skillYears,
        primary: false,
      };

      const res = await apiClient.post('/candidates/me/skills', payload);
      const updatedCandidate = res.data?.data || res.data;
      if (updatedCandidate?.skills) {
        setSkills(updatedCandidate.skills);
      } else {
        setSkills((prev) => [...prev, { id: Date.now(), skillName: skillNameInput.trim(), proficiency: skillProficiency, years: skillYears }]);
      }

      showToast(`⚡ Skill "${skillNameInput.trim()}" added to your stack!`);
      setSkillNameInput('');
      setShowSkillModal(false);
    } catch (err: any) {
      console.error('Error adding skill:', err);
      setError(err?.response?.data?.message || 'Failed to add skill.');
    } finally {
      setSavingSkill(false);
    }
  };

  const handleDeleteSkill = async (skillId: number) => {
    try {
      await apiClient.delete(`/candidates/me/skills/${skillId}`);
      setSkills((prev) => prev.filter((s) => s.id !== skillId));
      showToast('Skill removed.');
    } catch (err: any) {
      setSkills((prev) => prev.filter((s) => s.id !== skillId));
      showToast('Skill removed.');
    }
  };

  const handleQuickAddSkill = async (
    skillName: string,
    proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' = 'ADVANCED',
    years: number = 2
  ) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.skillName.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Skill "${trimmed}" is already in your stack!`);
      return;
    }
    try {
      const payload = {
        skillName: trimmed,
        proficiency,
        years,
        primary: false,
      };
      const res = await apiClient.post('/candidates/me/skills', payload);
      const updatedCandidate = res.data?.data || res.data;
      if (updatedCandidate?.skills) {
        setSkills(updatedCandidate.skills);
      } else {
        setSkills((prev) => [...prev, { id: Date.now(), skillName: trimmed, proficiency, years }]);
      }
      showToast(`⚡ Added "${trimmed}" (${proficiency}) to your stack!`);
      setSkillSearchQuery('');
      setDropdownSelectedSkill('');
      setShowSkillSearchDropdown(false);
    } catch (err: any) {
      console.error('Error adding skill:', err);
      setSkills((prev) => [...prev, { id: Date.now(), skillName: trimmed, proficiency, years }]);
      showToast(`⚡ Added "${trimmed}" (${proficiency}) to your stack!`);
      setSkillSearchQuery('');
      setDropdownSelectedSkill('');
      setShowSkillSearchDropdown(false);
    }
  };

  // ── EXPERIENCE CRUD ───────────────────────────────────────
  const handleSaveExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expCompany.trim() || !expTitle.trim()) return;

    setSavingExp(true);
    setError('');
    try {
      const payload: any = {
        company: expCompany.trim(),
        title: expTitle.trim(),
        location: expLocation.trim() || undefined,
        current: expCurrent,
        description: expDescription.trim() || undefined,
      };

      if (expStartDate) payload.startDate = expStartDate;
      if (expEndDate && !expCurrent) payload.endDate = expEndDate;

      const res = await apiClient.post('/candidates/me/experiences', payload);
      const updatedCandidate = res.data?.data || res.data;
      if (updatedCandidate?.experiences) {
        setExperiences(updatedCandidate.experiences);
      } else {
        setExperiences((prev) => [...prev, { id: Date.now(), company: expCompany, title: expTitle, location: expLocation, current: expCurrent, description: expDescription, startDate: expStartDate, endDate: expEndDate }]);
      }

      showToast(`💼 Experience at "${expCompany}" added!`);
      setShowExpModal(false);
      setExpCompany('');
      setExpTitle('');
      setExpLocation('');
      setExpStartDate('');
      setExpEndDate('');
      setExpCurrent(false);
      setExpDescription('');
    } catch (err: any) {
      console.error('Error saving experience:', err);
      setError(err?.response?.data?.message || 'Failed to add work experience.');
    } finally {
      setSavingExp(false);
    }
  };

  const handleDeleteExperience = async (expId: number) => {
    if (!confirm('Are you sure you want to remove this experience?')) return;
    try {
      await apiClient.delete(`/candidates/me/experiences/${expId}`);
      setExperiences((prev) => prev.filter((e) => e.id !== expId));
      showToast('Experience removed.');
    } catch (err: any) {
      setExperiences((prev) => prev.filter((e) => e.id !== expId));
      showToast('Experience removed.');
    }
  };

  // ── EDUCATION / QUALIFICATION CRUD ────────────────────────
  const openAddEduModal = (
    category: 'MASTERS' | 'BACHELORS' | 'TWELFTH' | 'TENTH' | 'DIPLOMA' | 'OTHER' = 'BACHELORS',
    defaultDegree = '',
    defaultField = ''
  ) => {
    setEditingEduId(null);
    setEduCategory(category);
    setEduInstitution('');
    setEduDegree(defaultDegree);
    setEduFieldOfStudy(defaultField);
    setEduGpa('');
    setEduStartDate('');
    setEduEndDate('');
    setEduCurrent(false);
    setEduDescription('');
    setShowInstitutionDropdown(false);
    setShowEduModal(true);
  };

  const openEditEduModal = (edu: CandidateEducation) => {
    setEditingEduId(edu.id || null);
    const d = (edu.degree || '').toLowerCase();
    const f = (edu.fieldOfStudy || '').toLowerCase();
    let cat: 'MASTERS' | 'BACHELORS' | 'TWELFTH' | 'TENTH' | 'DIPLOMA' | 'OTHER' = 'OTHER';
    if (d.includes('master') || d.includes('m.') || d.includes('mtech') || d.includes('mba') || d.includes('msc') || d.includes('mca')) {
      cat = 'MASTERS';
    } else if (d.includes('bachelor') || d.includes('b.') || d.includes('btech') || d.includes('be') || d.includes('bsc') || d.includes('bca') || d.includes('bba')) {
      cat = 'BACHELORS';
    } else if (d.includes('12') || d.includes('twelfth') || d.includes('senior secondary') || d.includes('intermediate') || f.includes('pcm') || f.includes('pcb')) {
      cat = 'TWELFTH';
    } else if (d.includes('10') || d.includes('tenth') || d.includes('secondary') || d.includes('matriculation')) {
      cat = 'TENTH';
    } else if (d.includes('diploma') || d.includes('polytechnic') || d.includes('certificate')) {
      cat = 'DIPLOMA';
    }
    setEduCategory(cat);
    setEduInstitution(edu.institution || '');
    setEduDegree(edu.degree || '');
    setEduFieldOfStudy(edu.fieldOfStudy || '');
    setEduGpa(edu.gpa ? edu.gpa.toString() : '');
    setEduStartDate(edu.startDate || '');
    setEduEndDate(edu.endDate || '');
    setEduCurrent(Boolean(edu.current));
    setEduDescription(edu.description || '');
    setShowInstitutionDropdown(false);
    setShowEduModal(true);
  };

  const handleSaveEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduInstitution.trim() || !eduDegree.trim()) {
      setError('Please provide institution and degree / qualification title.');
      return;
    }

    setSavingEdu(true);
    setError('');
    try {
      const payload: any = {
        institution: eduInstitution.trim(),
        degree: eduDegree.trim(),
        fieldOfStudy: eduFieldOfStudy.trim() || undefined,
        current: eduCurrent,
        description: eduDescription.trim() || undefined,
      };

      if (eduGpa.trim()) {
        const num = parseFloat(eduGpa.trim());
        payload.gpa = !isNaN(num) ? num : undefined;
      }
      if (eduStartDate) payload.startDate = eduStartDate;
      if (eduEndDate) payload.endDate = eduEndDate;

      if (editingEduId) {
        const res = await apiClient.put(`/candidates/me/educations/${editingEduId}`, payload);
        const updatedCandidate = res.data?.data || res.data;
        if (updatedCandidate?.educations) {
          setEducations(updatedCandidate.educations);
        } else {
          setEducations((prev) =>
            prev.map((item) => (item.id === editingEduId ? { ...item, ...payload, id: editingEduId } : item))
          );
        }
        showToast('🎓 Qualification updated successfully!');
      } else {
        const res = await apiClient.post('/candidates/me/educations', payload);
        const updatedCandidate = res.data?.data || res.data;
        if (updatedCandidate?.educations) {
          setEducations(updatedCandidate.educations);
        } else {
          setEducations((prev) => [...prev, { ...payload, id: Date.now() }]);
        }
        showToast('🎓 Qualification added successfully!');
      }

      setShowEduModal(false);
      setEditingEduId(null);
    } catch (err: any) {
      console.error('Error saving education:', err);
      setError(err?.response?.data?.message || 'Failed to save qualification details.');
    } finally {
      setSavingEdu(false);
    }
  };

  const handleDeleteEducation = async (eduId?: number) => {
    if (!eduId) return;
    if (!confirm('Are you sure you want to remove this qualification?')) return;
    try {
      await apiClient.delete(`/candidates/me/educations/${eduId}`);
      setEducations((prev) => prev.filter((e) => e.id !== eduId));
      showToast('Qualification removed.');
    } catch (err: any) {
      setEducations((prev) => prev.filter((e) => e.id !== eduId));
      showToast('Qualification removed.');
    }
  };

  const getEduCategoryBadge = (deg: string, field?: string) => {
    const d = (deg || '').toLowerCase();
    const f = (field || '').toLowerCase();
    if (d.includes('master') || d.includes('m.') || d.includes('mtech') || d.includes('mba') || d.includes('msc') || d.includes('mca')) {
      return { label: "Master's Degree", icon: '🎓', colorClass: 'master' };
    }
    if (d.includes('bachelor') || d.includes('b.') || d.includes('btech') || d.includes('be') || d.includes('bsc') || d.includes('bca') || d.includes('bba')) {
      return { label: "Bachelor's Degree", icon: '🏛️', colorClass: 'bachelor' };
    }
    if (d.includes('12') || d.includes('twelfth') || d.includes('senior secondary') || d.includes('intermediate') || d.includes('hsc') || f.includes('pcm') || f.includes('pcb')) {
      return { label: 'Class 12th (Senior Secondary)', icon: '🏫', colorClass: 'twelfth' };
    }
    if (d.includes('10') || d.includes('tenth') || d.includes('secondary') || d.includes('matriculation') || d.includes('ssc')) {
      return { label: 'Class 10th (Secondary School)', icon: '🎒', colorClass: 'tenth' };
    }
    if (d.includes('diploma') || d.includes('polytechnic') || d.includes('certificate')) {
      return { label: 'Diploma / Certificate', icon: '📜', colorClass: 'diploma' };
    }
    return { label: 'Academic Qualification', icon: '📜', colorClass: 'bachelor' };
  };

  // ── UPDATE CANDIDATE PROFILE HEADER ───────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setError('');
    try {
      const payload = {
        headline: editHeadline.trim() || undefined,
        bio: editBio.trim() || undefined,
        currentTitle: editCurrentTitle.trim() || undefined,
        currentCompany: editCurrentCompany.trim() || undefined,
        location: editLocation.trim() || undefined,
        yearsExperience: editYearsExp,
        githubUrl: editGithub.trim() || undefined,
        linkedinUrl: editLinkedin.trim() || undefined,
      };

      const res = await apiClient.put('/candidates/me', payload);
      const updated = res.data?.data || res.data;
      if (updated) {
        setProfile(updated);
        showToast('🌟 Candidate profile details updated successfully!');
      }
      setShowProfileModal(false);
    } catch (err: any) {
      console.error('Error updating candidate profile:', err);
      setError(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── RESUME UPLOAD HANDLER ─────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('versionName', file.name.replace(/\.[^/.]+$/, ''));

    setUploadingResume(true);
    setError('');
    try {
      const res = await apiClient.post('/resumes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newResume = res.data?.data || res.data;
      setResumes((prev) => [newResume, ...prev]);
      showToast('📄 Resume uploaded and queued for AI intelligence parsing!');
    } catch (err: any) {
      console.error('Resume upload failed:', err);
      setError(err?.response?.data?.message || 'Failed to upload resume file.');
    } finally {
      setUploadingResume(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteResume = async (resumeId: number) => {
    if (!confirm('Are you sure you want to remove this resume?')) return;
    try {
      await apiClient.delete(`/resumes/${resumeId}`);
      setResumes((prev) => prev.filter((r) => r.id !== resumeId));
      showToast('Resume removed.');
    } catch (err: any) {
      setResumes((prev) => prev.filter((r) => r.id !== resumeId));
      showToast('Resume removed.');
    }
  };

  const handleDownloadResume = async (resumeId: number, fileName: string) => {
    try {
      const res = await apiClient.get(`/resumes/${resumeId}/download`, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'resume.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert('Could not download resume file.');
    }
  };

  // ── Helper Category Badge Styles ──
  const getCategoryClass = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case 'WEB': return 'category-web';
      case 'MOBILE': return 'category-mobile';
      case 'AI_ML': return 'category-ai_ml';
      case 'SYSTEM': return 'category-system';
      case 'CLOUD':
      case 'CLOUD_DEVOPS': return 'category-cloud';
      case 'DESIGN': return 'category-design';
      default: return 'category-web';
    }
  };

  const displayName = profile?.firstName && profile?.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email?.split('@')[0] || 'Candidate';

  return (
    <div className={`portfolio-page-wrapper ${embedded ? 'is-embedded' : ''} ${isLight ? 'theme-light' : 'theme-universe'}`}>
      {/* 3D Interactive Milky Way Galaxy Canvas */}
      {!embedded && <MilkyWay3DCanvas interactive={true} showOrbits={true} />}

      <div className="portfolio-container">
        {/* Toast / Feedback Banner */}
        {successMsg && (
          <div style={{ padding: '12px 18px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: 14, color: '#4ADE80', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, fontWeight: 600, backdropFilter: 'blur(12px)' }}>
            <CheckCircle2 size={18} /> {successMsg}
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 18px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 14, color: '#FCA5A5', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, backdropFilter: 'blur(12px)' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* ── 3D Hero Profile Header Card ── */}
        <div className="portfolio-hero-card">
          <div className="portfolio-hero-info">
            <div className="portfolio-avatar-glow" style={{ overflow: 'hidden' }}>
              {(profile?.avatarUrl || user?.avatarUrl) ? (
                <img
                  src={profile?.avatarUrl || user?.avatarUrl}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>

            <div className="portfolio-hero-meta">
              <h1>{displayName}</h1>
              <p className="portfolio-hero-sub">
                <Sparkles size={15} color="#38BDF8" />
                {profile?.currentTitle || 'Full-Stack Software Engineer'}
                {profile?.currentCompany ? ` @ ${profile.currentCompany}` : ''}
              </p>

              <div className="portfolio-hero-tags">
                {profile?.location && (
                  <span className="portfolio-hero-tag-item">
                    <MapPin size={13} /> {profile.location}
                  </span>
                )}
                {profile?.yearsExperience !== undefined && profile?.yearsExperience > 0 && (
                  <span className="portfolio-hero-tag-item">
                    <Briefcase size={13} /> {profile.yearsExperience}+ Years Exp
                  </span>
                )}
                {profile?.githubUrl && (
                  <a
                    href={profile.githubUrl.startsWith('http') ? profile.githubUrl : `https://${profile.githubUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                  >
                    <GitBranch size={13} /> GitHub
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="portfolio-hero-actions">
            <button onClick={() => setShowProfileModal(true)} className="portfolio-edit-profile-btn">
              <Edit3 size={15} /> Edit Profile Info
            </button>
          </div>
        </div>

        {/* ── Section Navigation Tabs ── */}
        <div className="portfolio-tabs-nav">
          <button
            onClick={() => setActiveTab('projects')}
            className={`portfolio-tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
          >
            <FolderGit2 size={16} /> Projects Showcase
            <span className="portfolio-tab-badge">{portfolios.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={`portfolio-tab-btn ${activeTab === 'skills' ? 'active skills' : ''}`}
          >
            <Cpu size={16} /> Skills & Tech Stack Matrix
            <span className="portfolio-tab-badge">{skills.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('experience')}
            className={`portfolio-tab-btn ${activeTab === 'experience' ? 'active experience' : ''}`}
          >
            <Building2 size={16} /> Work History & Companies
            <span className="portfolio-tab-badge">{experiences.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('qualifications')}
            className={`portfolio-tab-btn ${activeTab === 'qualifications' ? 'active qualifications' : ''}`}
          >
            <GraduationCap size={16} /> Qualifications & Education
            <span className="portfolio-tab-badge">{educations.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('resume')}
            className={`portfolio-tab-btn ${activeTab === 'resume' ? 'active resume' : ''}`}
          >
            <FileText size={16} /> Resume Center
            <span className="portfolio-tab-badge">{resumes.length}</span>
          </button>
        </div>

        {/* ── TAB 1: PROJECTS SHOWCASE ── */}
        {activeTab === 'projects' && (
          <div>
            <div className="portfolio-section-header">
              <div>
                <h2 className="portfolio-section-title">
                  <FolderGit2 size={22} color="#38BDF8" />
                  Technical Project Showcase
                </h2>
                <p className="portfolio-section-subtitle">
                  Live systems, production microservices, full-stack applications, and open-source repositories
                </p>
              </div>

              <button onClick={openCreateProjectModal} className="portfolio-primary-add-btn">
                <Plus size={16} /> Add Project
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8' }}>
                <Sparkles size={32} className="spinning" style={{ margin: '0 auto 12px' }} />
                <p>Loading projects...</p>
              </div>
            ) : portfolios.length === 0 ? (
              <div className="portfolio-empty-state">
                <div className="portfolio-empty-icon">
                  <FolderGit2 size={36} />
                </div>
                <h3 className="portfolio-empty-title">No Projects Showcased Yet</h3>
                <p className="portfolio-empty-desc">
                  Start building your high-impact technical portfolio. Add your distributed systems, React apps, AI projects, and GitHub links.
                </p>
                <button onClick={openCreateProjectModal} className="portfolio-primary-add-btn">
                  <Plus size={16} /> Add Your First Project
                </button>
              </div>
            ) : (
              <div className="portfolio-projects-grid">
                {portfolios.map((item) => (
                  <div key={item.id} className="portfolio-item-card">
                    {item.thumbnailUrl && (
                      <div className="portfolio-item-image-wrapper">
                        <img src={item.thumbnailUrl} alt={item.title} className="portfolio-item-image" />
                        <span className={`portfolio-category-badge ${getCategoryClass(item.category)}`}>
                          {item.category}
                        </span>
                      </div>
                    )}

                    <div className="portfolio-item-body">
                      {!item.thumbnailUrl && (
                        <div style={{ marginBottom: 12 }}>
                          <span className={`portfolio-category-badge ${getCategoryClass(item.category)}`}>
                            {item.category}
                          </span>
                        </div>
                      )}

                      <h3 className="portfolio-item-title">{item.title}</h3>
                      <p className="portfolio-item-desc">{item.description}</p>

                      <div className="portfolio-item-footer">
                        <div className="portfolio-item-links">
                          {item.githubUrl && (
                            <a
                              href={item.githubUrl.startsWith('http') ? item.githubUrl : `https://${item.githubUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="portfolio-link-btn"
                            >
                              <GitBranch size={14} /> GitHub
                            </a>
                          )}
                          {item.projectUrl && (
                            <a
                              href={item.projectUrl.startsWith('http') ? item.projectUrl : `https://${item.projectUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="portfolio-link-btn"
                            >
                              <ExternalLink size={14} /> Live Demo
                            </a>
                          )}
                        </div>

                        <div className="portfolio-card-actions">
                          <button
                            onClick={() => openEditProjectModal(item)}
                            className="portfolio-action-icon-btn edit"
                            title="Edit Project"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(item.id)}
                            className="portfolio-action-icon-btn delete"
                            title="Delete Project"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: SKILLS & TECH STACK MATRIX ── */}
        {activeTab === 'skills' && (
          <div className="portfolio-skills-section">
            <div className="portfolio-section-header">
              <div>
                <h2 className="portfolio-section-title">
                  <Cpu size={22} color="#A855F7" />
                  Verified Skills &amp; Tech Stack Matrix
                </h2>
                <p className="portfolio-section-subtitle">
                  Search, filter, and add programming languages, frameworks, cloud tools, and databases with proficiency scoring
                </p>
              </div>

              <button onClick={() => setShowSkillModal(true)} className="portfolio-primary-add-btn">
                <Plus size={16} /> Custom Skill Dialog
              </button>
            </div>

            {/* Interactive Search & Categorized Dropdown Selector Box */}
            <div className="portfolio-skill-search-box">
              <div className="portfolio-skill-search-grid">
                {/* 1. Category Filter Dropdown */}
                <div className="portfolio-form-group">
                  <label className="portfolio-field-label">📁 Category Filter</label>
                  <select
                    className="portfolio-select"
                    value={skillCategoryFilter}
                    onChange={(e) => {
                      setSkillCategoryFilter(e.target.value);
                      setDropdownSelectedSkill('');
                    }}
                  >
                    <option value="ALL">🌟 All Categories (Search Everywhere)</option>
                    {CATEGORIZED_SKILLS.map((cat) => (
                      <option key={cat.category} value={cat.category}>
                        {cat.category} ({cat.skills.length})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Category Skills Dropdown List */}
                <div className="portfolio-form-group">
                  <label className="portfolio-field-label">📋 Select from Dropdown List</label>
                  <select
                    className="portfolio-select"
                    value={dropdownSelectedSkill}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDropdownSelectedSkill(val);
                      if (val) {
                        setSkillSearchQuery(val);
                      }
                    }}
                  >
                    <option value="">-- Choose a skill to add --</option>
                    {(skillCategoryFilter === 'ALL'
                      ? CATEGORIZED_SKILLS.flatMap((c) => c.skills)
                      : CATEGORIZED_SKILLS.find((c) => c.category === skillCategoryFilter)?.skills || []
                    ).map((s) => {
                      const isAdded = skills.some((userSkill) => userSkill.skillName.toLowerCase() === s.toLowerCase());
                      return (
                        <option key={s} value={s} disabled={isAdded}>
                          {s} {isAdded ? '✓ (Already in stack)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 3. Search or Type Custom Skill with Autocomplete */}
                <div className="portfolio-form-group" ref={skillSearchRef} style={{ position: 'relative' }}>
                  <label className="portfolio-field-label">🔍 Live Search or Custom Name</label>
                  <div className="portfolio-skill-search-input-wrapper">
                    <input
                      type="text"
                      className="portfolio-input"
                      placeholder="Type e.g. React, Docker, Python..."
                      value={skillSearchQuery}
                      onChange={(e) => {
                        setSkillSearchQuery(e.target.value);
                        setShowSkillSearchDropdown(true);
                        setDropdownSelectedSkill('');
                      }}
                      onFocus={() => setShowSkillSearchDropdown(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (skillSearchQuery.trim()) {
                            handleQuickAddSkill(skillSearchQuery, quickProficiency, quickYears);
                          }
                        }
                      }}
                    />
                    {skillSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSkillSearchQuery('');
                          setDropdownSelectedSkill('');
                        }}
                        className="portfolio-search-clear-btn"
                        title="Clear"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Dropdown */}
                  {showSkillSearchDropdown && skillSearchQuery.trim().length > 0 && (
                    <div className="portfolio-skill-autocomplete-dropdown">
                      {/* Filter matching skills */}
                      {(() => {
                        const q = skillSearchQuery.toLowerCase().trim();
                        const allAvailable = CATEGORIZED_SKILLS.flatMap((c) =>
                          c.skills.map((s) => ({ skill: s, category: c.category }))
                        );
                        const matches = allAvailable.filter((item) =>
                          item.skill.toLowerCase().includes(q)
                        );

                        return (
                          <>
                            {matches.slice(0, 8).map((item, idx) => {
                              const isAdded = skills.some(
                                (s) => s.skillName.toLowerCase() === item.skill.toLowerCase()
                              );
                              return (
                                <div
                                  key={idx}
                                  className={`portfolio-skill-autocomplete-item ${isAdded ? 'disabled' : ''}`}
                                  onClick={() => {
                                    if (!isAdded) {
                                      handleQuickAddSkill(item.skill, quickProficiency, quickYears);
                                    }
                                  }}
                                >
                                  <div className="portfolio-skill-match-name">
                                    <Sparkles size={14} color="#A855F7" />
                                    <span>{item.skill}</span>
                                    <span className="portfolio-skill-match-cat">{item.category}</span>
                                  </div>
                                  <span className={`portfolio-skill-match-action ${isAdded ? 'added' : ''}`}>
                                    {isAdded ? 'Added ✓' : '+ Add'}
                                  </span>
                                </div>
                              );
                            })}

                            {/* Option to add as custom skill */}
                            {!matches.some((m) => m.skill.toLowerCase() === q) && (
                              <div
                                className="portfolio-skill-autocomplete-item custom"
                                onClick={() => handleQuickAddSkill(skillSearchQuery, quickProficiency, quickYears)}
                              >
                                <div className="portfolio-skill-match-name">
                                  <Plus size={14} color="#38BDF8" />
                                  <span>Add "<strong>{skillSearchQuery.trim()}</strong>" as custom skill</span>
                                </div>
                                <span className="portfolio-skill-match-action custom">+ Add Custom</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Proficiency Level and Add Button Bar */}
              <div className="portfolio-skill-add-bar">
                <div className="portfolio-skill-proficiency-selector">
                  <span className="portfolio-skill-prof-label">Proficiency:</span>
                  <div className="portfolio-prof-pills">
                    {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setQuickProficiency(lvl)}
                        className={`portfolio-prof-pill ${lvl.toLowerCase()} ${quickProficiency === lvl ? 'active' : ''}`}
                      >
                        {lvl.charAt(0) + lvl.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                    <span className="portfolio-skill-prof-label">Years:</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={quickYears}
                      onChange={(e) => setQuickYears(Math.max(1, Number(e.target.value)))}
                      className="portfolio-input"
                      style={{ width: 56, padding: '5px 8px', fontSize: 13, height: 32 }}
                    />
                  </div>
                </div>

                <div className="portfolio-skill-add-btn-group">
                  <button
                    type="button"
                    disabled={!skillSearchQuery.trim()}
                    onClick={() => handleQuickAddSkill(skillSearchQuery, quickProficiency, quickYears)}
                    className="portfolio-skill-submit-btn"
                  >
                    <Plus size={15} /> Add to Tech Stack
                  </button>
                </div>
              </div>
            </div>

            {/* Current Active Skills Matrix */}
            <div className="portfolio-current-skills-header">
              <h3 className="portfolio-skills-count-title">
                Current Technical Stack ({skills.length} skills)
              </h3>
              {skills.length > 0 && (
                <span className="portfolio-skills-tip">
                  Click the ✕ on any skill card to remove it from your stack
                </span>
              )}
            </div>

            {skills.length === 0 ? (
              <div className="portfolio-empty-state">
                <div className="portfolio-empty-icon" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#C084FC' }}>
                  <Cpu size={36} />
                </div>
                <h3 className="portfolio-empty-title">No Skills in Your Stack Yet</h3>
                <p className="portfolio-empty-desc">
                  Use the categorized dropdown or search box above to add your languages, frameworks, and infrastructure tools.
                </p>
              </div>
            ) : (
              <div className="portfolio-skills-grid">
                {skills.map((skill) => (
                  <div key={skill.id} className="portfolio-skill-card">
                    <div className="portfolio-skill-info">
                      <span className="portfolio-skill-name">{skill.skillName}</span>
                      <div className="portfolio-skill-meta-row">
                        <span className={`portfolio-skill-badge ${skill.proficiency?.toLowerCase() || 'intermediate'}`}>
                          {skill.proficiency || 'INTERMEDIATE'}
                        </span>
                        {skill.years && skill.years > 0 && (
                          <span className="portfolio-skill-years-tag">
                            {skill.years} {skill.years === 1 ? 'yr' : 'yrs'}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteSkill(skill.id)}
                      className="portfolio-skill-delete-btn"
                      title="Remove Skill"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: WORK HISTORY & COMPANIES ── */}
        {activeTab === 'experience' && (
          <div>
            <div className="portfolio-section-header">
              <div>
                <h2 className="portfolio-section-title">
                  <Building2 size={22} color="#F59E0B" />
                  Work Experience & Company History
                </h2>
                <p className="portfolio-section-subtitle">
                  Where you are currently working and previous software companies, roles, and accomplishments
                </p>
              </div>

              <button onClick={() => setShowExpModal(true)} className="portfolio-primary-add-btn">
                <Plus size={16} /> Add Experience
              </button>
            </div>

            {experiences.length === 0 ? (
              <div className="portfolio-empty-state">
                <div className="portfolio-empty-icon" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24' }}>
                  <Building2 size={36} />
                </div>
                <h3 className="portfolio-empty-title">No Work History Added Yet</h3>
                <p className="portfolio-empty-desc">
                  Add your current job, previous engineering roles, and software accomplishments to showcase your career trajectory.
                </p>
                <button onClick={() => setShowExpModal(true)} className="portfolio-primary-add-btn">
                  <Plus size={16} /> Add Current / Past Company
                </button>
              </div>
            ) : (
              <div className="portfolio-experience-list">
                {experiences.map((exp) => (
                  <div key={exp.id} className="portfolio-experience-card">
                    <div className="portfolio-exp-header">
                      <div>
                        <h3 className="portfolio-exp-title">{exp.title}</h3>
                        <div className="portfolio-exp-company">
                          <Building2 size={14} /> {exp.company}
                          {exp.current && <span className="portfolio-exp-current-badge">Current Position</span>}
                          {exp.location && <span style={{ color: '#94A3B8', fontSize: 13 }}>• {exp.location}</span>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="portfolio-exp-dates">
                          <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
                          {exp.startDate || 'Started'} — {exp.current ? 'Present' : exp.endDate || 'Ended'}
                        </span>
                        <button
                          onClick={() => handleDeleteExperience(exp.id)}
                          className="portfolio-action-icon-btn delete"
                          title="Delete Experience"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {exp.description && <p className="portfolio-exp-desc">{exp.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: QUALIFICATIONS & EDUCATION (NEW) ── */}
        {activeTab === 'qualifications' && (
          <div>
            <div className="portfolio-section-header">
              <div>
                <h2 className="portfolio-section-title">
                  <GraduationCap size={22} color="#10B981" />
                  Academic Qualifications &amp; Education
                </h2>
                <p className="portfolio-section-subtitle">
                  Master's degree, Bachelor's degree, 12th &amp; 10th standard schooling, streams, boards, and CGPA scores
                </p>
              </div>

              <button onClick={() => openAddEduModal('BACHELORS')} className="portfolio-primary-add-btn">
                <Plus size={16} /> Add Qualification
              </button>
            </div>

            {/* Quick Templates Bar */}
            <div className="qual-templates-bar">
              <span className="qual-templates-label">
                <Sparkles size={14} /> Quick Add Templates:
              </span>
              <button
                onClick={() => openAddEduModal('MASTERS', 'Master of Technology (M.Tech)', 'Computer Science & Engineering')}
                className="qual-template-chip"
              >
                + 🎓 Master's Degree
              </button>
              <button
                onClick={() => openAddEduModal('BACHELORS', 'Bachelor of Technology (B.Tech)', 'Computer Science & Engineering')}
                className="qual-template-chip"
              >
                + 🏛️ Bachelor's Degree
              </button>
              <button
                onClick={() => openAddEduModal('TWELFTH', 'Class 12th / Senior Secondary (HSC)', 'Science (Physics, Chemistry, Maths)')}
                className="qual-template-chip"
              >
                + 🏫 Class 12th (Senior Secondary)
              </button>
              <button
                onClick={() => openAddEduModal('TENTH', 'Class 10th / Secondary School (SSC)', 'General Science & Mathematics')}
                className="qual-template-chip"
              >
                + 🎒 Class 10th (Secondary School)
              </button>
              <button
                onClick={() => openAddEduModal('DIPLOMA', 'Post Graduate Diploma in Software Development', 'Information Technology')}
                className="qual-template-chip"
              >
                + 📜 Diploma / Certification
              </button>
            </div>

            {/* List of Qualifications */}
            {educations.length === 0 ? (
              <div className="portfolio-empty-state">
                <div className="portfolio-empty-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399' }}>
                  <GraduationCap size={36} />
                </div>
                <h3 className="portfolio-empty-title">No Academic Qualifications Added Yet</h3>
                <p className="portfolio-empty-desc">
                  Showcase your academic journey from 10th &amp; 12th schooling to Bachelor's and Master's degrees.
                </p>
                <button onClick={() => openAddEduModal('BACHELORS')} className="portfolio-primary-add-btn">
                  <Plus size={16} /> Add Your First Qualification
                </button>
              </div>
            ) : (
              <div className="qual-list-grid">
                {educations.map((edu, idx) => {
                  const badge = getEduCategoryBadge(edu.degree, edu.fieldOfStudy);
                  const formatYearText = () => {
                    if (edu.startDate && edu.endDate) {
                      const s = edu.startDate.slice(0, 4);
                      const e = edu.current ? 'Present' : edu.endDate.slice(0, 4);
                      return `${s} – ${e}`;
                    }
                    if (edu.endDate) return `Completed in ${edu.endDate.slice(0, 4)}`;
                    if (edu.current) return 'Currently Pursuing';
                    return 'Completed';
                  };

                  return (
                    <div key={edu.id || idx} className="qual-card">
                      <div className="qual-card-left-badge">
                        <div className="qual-icon-box">{badge.icon}</div>
                        <span className={`qual-level-indicator ${badge.colorClass}`}>{badge.label}</span>
                      </div>

                      <div className="qual-card-content">
                        <div className="qual-card-header">
                          <div>
                            <h3 className="qual-degree-title">{edu.degree}</h3>
                            <div className="qual-institution-name">
                              <Building2 size={14} /> {edu.institution}
                            </div>
                          </div>

                          <div className="qual-actions-btn-group">
                            <button
                              onClick={() => openEditEduModal(edu)}
                              className="qual-action-btn edit"
                              title="Edit Qualification"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteEducation(edu.id)}
                              className="qual-action-btn delete"
                              title="Delete Qualification"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="qual-meta-tags-row">
                          {edu.fieldOfStudy && (
                            <span className="qual-tag stream">
                              <BookOpen size={12} /> {edu.fieldOfStudy}
                            </span>
                          )}

                          <span className="qual-tag year">
                            <Calendar size={12} /> {formatYearText()}
                          </span>

                          {edu.gpa && (
                            <span className="qual-tag grade">
                              <Award size={12} /> Score: {edu.gpa.toString().includes('%') || edu.gpa.toString().toLowerCase().includes('cgpa') ? edu.gpa : `${edu.gpa} CGPA / %`}
                            </span>
                          )}

                          {edu.current && (
                            <span className="qual-tag pursuing">
                              ✦ Ongoing
                            </span>
                          )}
                        </div>

                        {edu.description && (
                          <p className="qual-description-text">{edu.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: RESUME CENTER ── */}
        {activeTab === 'resume' && (
          <div className="portfolio-resume-container">
            <div className="portfolio-section-header">
              <div>
                <h2 className="portfolio-section-title">
                  <FileText size={22} color="#EC4899" />
                  Resume & Document Center
                </h2>
                <p className="portfolio-section-subtitle">
                  Upload your latest PDF/DOCX resume for automated AI parsing and recruiter review
                </p>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              className="portfolio-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <div className="portfolio-dropzone-icon">
                <UploadCloud size={36} />
              </div>
              <h3 className="portfolio-dropzone-title">
                {uploadingResume ? 'Uploading & Parsing with AI...' : 'Click to Upload Resume (PDF / DOCX)'}
              </h3>
              <p className="portfolio-dropzone-desc">
                Maximum file size: 10MB • Your primary resume is attached to all 1-Click Applications
              </p>
            </div>

            {/* Active Resumes List */}
            {resumes.length === 0 ? (
              <div className="portfolio-empty-state" style={{ marginTop: 24 }}>
                <p className="portfolio-empty-desc">No resume uploaded yet. Upload one above to unlock AI semantic matching.</p>
              </div>
            ) : (
              <div className="portfolio-resume-list">
                {resumes.map((res) => (
                  <div key={res.id} className="portfolio-resume-card">
                    <div className="portfolio-resume-meta">
                      <div className="portfolio-resume-icon">
                        <FileText size={22} />
                      </div>
                      <div>
                        <h4 className="portfolio-resume-filename">{res.fileName || 'Resume Document.pdf'}</h4>
                        <span className="portfolio-resume-size">
                          {res.fileSize ? `${(res.fileSize / 1024).toFixed(1)} KB` : 'PDF Document'}
                          {res.active ? ' • Active Primary' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="portfolio-resume-actions">
                      <button
                        onClick={() => handleDownloadResume(res.id, res.fileName)}
                        className="portfolio-resume-btn download"
                      >
                        <Download size={13} /> Download
                      </button>
                      <button
                        onClick={() => handleDeleteResume(res.id)}
                        className="portfolio-resume-btn delete"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MODAL 1: ADD / EDIT PROJECT ── */}
        {showProjectModal && (
          <div className="portfolio-modal-overlay">
            <div className="portfolio-modal-content">
              <div className="portfolio-modal-header">
                <h3 className="portfolio-modal-title">
                  {editingProjectId ? 'Edit Project Showcase' : 'Add New Project Showcase'}
                </h3>
                <button onClick={() => setShowProjectModal(false)} className="portfolio-modal-close-btn">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProject} className="portfolio-form">
                <div className="portfolio-form-group">
                  <label className="portfolio-field-label">Project Title *</label>
                  <input
                    type="text"
                    className="portfolio-input"
                    required
                    placeholder="e.g. Distributed Event Streaming Platform"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                  />
                </div>

                <div className="portfolio-grid-2col">
                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">Category</label>
                    <select
                      className="portfolio-select"
                      value={projectCategory}
                      onChange={(e) => setProjectCategory(e.target.value)}
                    >
                      <option value="WEB">Web Application</option>
                      <option value="MOBILE">Mobile App</option>
                      <option value="AI_ML">AI / Machine Learning</option>
                      <option value="CLOUD_DEVOPS">Cloud / DevOps</option>
                      <option value="SYSTEM">System Architecture</option>
                      <option value="DESIGN">UI/UX Design</option>
                    </select>
                  </div>

                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">Thumbnail URL (Optional)</label>
                    <input
                      type="url"
                      className="portfolio-input"
                      placeholder="https://images.unsplash.com/..."
                      value={projectThumb}
                      onChange={(e) => setProjectThumb(e.target.value)}
                    />
                  </div>
                </div>

                <div className="portfolio-form-group">
                  <label className="portfolio-field-label">Description & Architecture *</label>
                  <textarea
                    className="portfolio-textarea"
                    required
                    placeholder="Describe your tech stack, system architecture, key challenges solved, and performance results..."
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                  />
                </div>

                <div className="portfolio-grid-2col">
                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">Live Demo URL</label>
                    <input
                      type="url"
                      className="portfolio-input"
                      placeholder="https://my-app.vercel.app"
                      value={projectUrl}
                      onChange={(e) => setProjectUrl(e.target.value)}
                    />
                  </div>

                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">GitHub Repository URL</label>
                    <input
                      type="url"
                      className="portfolio-input"
                      placeholder="https://github.com/username/project"
                      value={projectGithub}
                      onChange={(e) => setProjectGithub(e.target.value)}
                    />
                  </div>
                </div>

                <div className="portfolio-modal-actions">
                  <button type="button" onClick={() => setShowProjectModal(false)} className="portfolio-modal-cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="portfolio-modal-submit-btn" disabled={savingProject}>
                    {savingProject ? 'Saving...' : editingProjectId ? 'Update Project' : 'Publish Project Showcase ✨'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL 2: ADD SKILL ── */}
        {showSkillModal && (
          <div className="portfolio-modal-overlay">
            <div className="portfolio-modal-content" style={{ maxWidth: 450 }}>
              <div className="portfolio-modal-header">
                <h3 className="portfolio-modal-title">Add Custom Skill</h3>
                <button onClick={() => setShowSkillModal(false)} className="portfolio-modal-close-btn">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveSkill} className="portfolio-form">
                <div className="portfolio-form-group">
                  <label className="portfolio-field-label">Skill / Technology Name *</label>
                  <input
                    type="text"
                    className="portfolio-input"
                    required
                    placeholder="e.g. Distributed Caching, Redis, Next.js"
                    value={skillNameInput}
                    onChange={(e) => setSkillNameInput(e.target.value)}
                  />
                </div>

                <div className="portfolio-grid-2col">
                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">Proficiency Level</label>
                    <select
                      className="portfolio-select"
                      value={skillProficiency}
                      onChange={(e) => setSkillProficiency(e.target.value as any)}
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                      <option value="EXPERT">Expert</option>
                    </select>
                  </div>

                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">Years of Experience</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      className="portfolio-input"
                      value={skillYears}
                      onChange={(e) => setSkillYears(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="portfolio-modal-actions">
                  <button type="button" onClick={() => setShowSkillModal(false)} className="portfolio-modal-cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="portfolio-modal-submit-btn" disabled={savingSkill}>
                    {savingSkill ? 'Adding...' : 'Add Skill to Stack ⚡'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL 3: ADD / EDIT WORK EXPERIENCE ── */}
        {showExpModal && (
          <div className="portfolio-modal-overlay">
            <div className="portfolio-modal-content">
              <div className="portfolio-modal-header">
                <h3 className="portfolio-modal-title">Add Work Experience</h3>
                <button onClick={() => setShowExpModal(false)} className="portfolio-modal-close-btn">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveExperience} className="portfolio-form">
                <div className="portfolio-grid-2col">
                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">Company Name *</label>
                    <input
                      type="text"
                      className="portfolio-input"
                      required
                      placeholder="e.g. Google / Stripe / OpenAI"
                      value={expCompany}
                      onChange={(e) => setExpCompany(e.target.value)}
                    />
                  </div>

                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">Job Title / Role *</label>
                    <input
                      type="text"
                      className="portfolio-input"
                      required
                      placeholder="e.g. Senior Software Engineer"
                      value={expTitle}
                      onChange={(e) => setExpTitle(e.target.value)}
                    />
                  </div>
                </div>

                <div className="portfolio-grid-2col">
                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">Location</label>
                    <input
                      type="text"
                      className="portfolio-input"
                      placeholder="e.g. San Francisco, CA (Remote)"
                      value={expLocation}
                      onChange={(e) => setExpLocation(e.target.value)}
                    />
                  </div>

                  <div className="portfolio-form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: 24 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E2E8F0', cursor: 'pointer', fontSize: 13.5 }}>
                      <input
                        type="checkbox"
                        checked={expCurrent}
                        onChange={(e) => setExpCurrent(e.target.checked)}
                      />
                      I currently work in this role
                    </label>
                  </div>
                </div>

                <div className="portfolio-grid-2col">
                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">Start Date</label>
                    <input
                      type="date"
                      className="portfolio-input"
                      value={expStartDate}
                      onChange={(e) => setExpStartDate(e.target.value)}
                    />
                  </div>

                  {!expCurrent && (
                    <div className="portfolio-form-group">
                      <label className="portfolio-field-label">End Date</label>
                      <input
                        type="date"
                        className="portfolio-input"
                        value={expEndDate}
                        onChange={(e) => setExpEndDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="portfolio-form-group">
                  <label className="portfolio-field-label">Responsibilities & Key Achievements</label>
                  <textarea
                    className="portfolio-textarea"
                    placeholder="Describe your tech stack, system scaling achievements, microservices built, team leadership..."
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                  />
                </div>

                <div className="portfolio-modal-actions">
                  <button type="button" onClick={() => setShowExpModal(false)} className="portfolio-modal-cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="portfolio-modal-submit-btn" disabled={savingExp}>
                    {savingExp ? 'Saving...' : 'Save Experience 💼'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL 4: ADD / EDIT QUALIFICATION & EDUCATION (NEW) ── */}
        {showEduModal && (
          <div className="portfolio-modal-overlay">
            <div className="portfolio-modal-content">
              <div className="portfolio-modal-header">
                <h3 className="portfolio-modal-title">
                  {editingEduId ? 'Edit Academic Qualification' : 'Add Academic Qualification'}
                </h3>
                <button onClick={() => setShowEduModal(false)} className="portfolio-modal-close-btn">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEducation} className="portfolio-form">
                {/* Qualification Level Selection */}
                <div className="portfolio-form-group">
                  <label className="portfolio-field-label">Qualification Level / Degree Category *</label>
                  <select
                    className="portfolio-select"
                    value={eduCategory}
                    onChange={(e) => {
                      const cat = e.target.value as any;
                      setEduCategory(cat);
                      if (cat === 'MASTERS' && !eduDegree) {
                        setEduDegree('Master of Technology (M.Tech)');
                        setEduFieldOfStudy('Computer Science & Engineering');
                      } else if (cat === 'BACHELORS' && !eduDegree) {
                        setEduDegree('Bachelor of Technology (B.Tech)');
                        setEduFieldOfStudy('Computer Science & Engineering');
                      } else if (cat === 'TWELFTH' && !eduDegree) {
                        setEduDegree('Class 12th / Senior Secondary (HSC)');
                        setEduFieldOfStudy('Science (PCM - Physics, Chemistry, Maths)');
                      } else if (cat === 'TENTH' && !eduDegree) {
                        setEduDegree('Class 10th / Secondary School (SSC)');
                        setEduFieldOfStudy('General Science & Mathematics');
                      }
                    }}
                  >
                    <option value="MASTERS">🎓 Master's Degree (M.Tech, M.S., MBA, M.Sc., MCA)</option>
                    <option value="BACHELORS">🏛️ Bachelor's Degree (B.Tech, B.E., B.S., B.Sc., BCA, B.Com)</option>
                    <option value="TWELFTH">🏫 Class 12th / Senior Secondary / Intermediate (HSC)</option>
                    <option value="TENTH">🎒 Class 10th / Secondary School / Matriculation (SSC)</option>
                    <option value="DIPLOMA">📜 Diploma / Polytechnic / Post-Graduate Certification</option>
                    <option value="OTHER">✦ Other Academic Qualification / Doctorate (Ph.D.)</option>
                  </select>
                </div>

                {/* College / University / School Name with Debounced Autocomplete */}
                <div className="portfolio-form-group">
                  <label className="portfolio-field-label">
                    {eduCategory === 'TENTH' || eduCategory === 'TWELFTH' ? 'School / Junior College Name *' : 'College / University Name *'}
                  </label>
                  <div className="college-autocomplete-wrapper">
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="portfolio-input"
                        required
                        placeholder={
                          eduCategory === 'TENTH' || eduCategory === 'TWELFTH'
                            ? 'e.g. Delhi Public School (DPS) / Kendriya Vidyalaya / St. Xavier’s'
                            : 'e.g. Indian Institute of Technology (IIT) Delhi / BITS Pilani / Stanford'
                        }
                        value={eduInstitution}
                        onChange={(e) => handleInstitutionChange(e.target.value)}
                        onFocus={() => {
                          if (institutionSuggestions.length > 0) setShowInstitutionDropdown(true);
                        }}
                      />
                      {isSearchingInstitutions && (
                        <Loader2 size={16} className="spinning" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#38BDF8' }} />
                      )}
                    </div>

                    {showInstitutionDropdown && institutionSuggestions.length > 0 && (
                      <div className="college-autocomplete-dropdown">
                        <div className="college-autocomplete-hint">
                          <Search size={12} /> Matching Institutes / Universities:
                        </div>
                        {institutionSuggestions.map((inst, idx) => (
                          <div
                            key={idx}
                            className="college-autocomplete-item"
                            onClick={() => handleSelectInstitution(inst)}
                          >
                            <Building2 size={14} className="college-autocomplete-item-icon" />
                            <span>{inst}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="portfolio-grid-2col">
                  {/* Degree Name */}
                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">Degree / Examination Name *</label>
                    <input
                      type="text"
                      className="portfolio-input"
                      required
                      placeholder={
                        eduCategory === 'TWELFTH'
                          ? 'e.g. Senior Secondary Certificate (12th)'
                          : eduCategory === 'TENTH'
                          ? 'e.g. Secondary School Certificate (10th)'
                          : 'e.g. Bachelor of Technology (B.Tech)'
                      }
                      value={eduDegree}
                      onChange={(e) => setEduDegree(e.target.value)}
                    />
                  </div>

                  {/* Stream / Branch */}
                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">
                      {eduCategory === 'TWELFTH' || eduCategory === 'TENTH' ? 'Stream / Board' : 'Branch / Field of Study'}
                    </label>
                    <input
                      type="text"
                      className="portfolio-input"
                      placeholder={
                        eduCategory === 'TWELFTH'
                          ? 'e.g. Science (PCM) - CBSE / ICSE / State Board'
                          : eduCategory === 'TENTH'
                          ? 'e.g. CBSE / ICSE / State Board'
                          : 'e.g. Computer Science, AI/ML, Electrical Engineering'
                      }
                      value={eduFieldOfStudy}
                      onChange={(e) => setEduFieldOfStudy(e.target.value)}
                    />
                  </div>
                </div>

                <div className="portfolio-grid-2col">
                  {/* Start Date / Year */}
                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">Start Date / Year</label>
                    <input
                      type="date"
                      className="portfolio-input"
                      value={eduStartDate}
                      onChange={(e) => setEduStartDate(e.target.value)}
                    />
                  </div>

                  {/* Completion Date / Year */}
                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">
                      {eduCurrent ? 'Expected Completion Date' : 'Completion Date / Passing Year'}
                    </label>
                    <input
                      type="date"
                      className="portfolio-input"
                      value={eduEndDate}
                      onChange={(e) => setEduEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="portfolio-grid-2col">
                  {/* Grade / Percentage / CGPA */}
                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">Grade / CGPA / Percentage (Optional)</label>
                    <input
                      type="text"
                      className="portfolio-input"
                      placeholder="e.g. 9.2 CGPA or 94.5%"
                      value={eduGpa}
                      onChange={(e) => setEduGpa(e.target.value)}
                    />
                  </div>

                  {/* Ongoing Checkbox */}
                  <div className="portfolio-form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: 24 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E2E8F0', cursor: 'pointer', fontSize: 13.5 }}>
                      <input
                        type="checkbox"
                        checked={eduCurrent}
                        onChange={(e) => setEduCurrent(e.target.checked)}
                      />
                      Currently Pursuing / In-Progress
                    </label>
                  </div>
                </div>

                {/* Description / Achievements */}
                <div className="portfolio-form-group">
                  <label className="portfolio-field-label">Achievements, Major Coursework &amp; Key Details (Optional)</label>
                  <textarea
                    className="portfolio-textarea"
                    placeholder="e.g. Department Rank 1, Major Project in Distributed Systems, Head of Coding Club, Scored 99.2% in State Board..."
                    value={eduDescription}
                    onChange={(e) => setEduDescription(e.target.value)}
                  />
                </div>

                <div className="portfolio-modal-actions">
                  <button type="button" onClick={() => setShowEduModal(false)} className="portfolio-modal-cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="portfolio-modal-submit-btn" disabled={savingEdu}>
                    {savingEdu ? 'Saving...' : editingEduId ? 'Update Qualification' : 'Save Qualification 🎓'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL 5: EDIT CANDIDATE PROFILE INFO ── */}
        {showProfileModal && (
          <div className="portfolio-modal-overlay">
            <div className="portfolio-modal-content">
              <div className="portfolio-modal-header">
                <h3 className="portfolio-modal-title">Edit Candidate Profile</h3>
                <button onClick={() => setShowProfileModal(false)} className="portfolio-modal-close-btn">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="portfolio-form">
                <div className="portfolio-grid-2col">
                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">Current Job Title</label>
                    <input
                      type="text"
                      className="portfolio-input"
                      placeholder="e.g. Staff Full Stack Engineer"
                      value={editCurrentTitle}
                      onChange={(e) => setEditCurrentTitle(e.target.value)}
                    />
                  </div>

                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">Current Company</label>
                    <input
                      type="text"
                      className="portfolio-input"
                      placeholder="e.g. Apex Innovations / Meta"
                      value={editCurrentCompany}
                      onChange={(e) => setEditCurrentCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div className="portfolio-grid-2col">
                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">Location</label>
                    <input
                      type="text"
                      className="portfolio-input"
                      placeholder="e.g. Seattle, WA / Remote"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                    />
                  </div>

                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">Total Years Experience</label>
                    <input
                      type="number"
                      min={0}
                      max={40}
                      className="portfolio-input"
                      value={editYearsExp}
                      onChange={(e) => setEditYearsExp(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="portfolio-form-group">
                  <label className="portfolio-field-label">Headline / Professional Summary</label>
                  <input
                    type="text"
                    className="portfolio-input"
                    placeholder="e.g. Senior Backend Engineer specializing in high-throughput distributed systems"
                    value={editHeadline}
                    onChange={(e) => setEditHeadline(e.target.value)}
                  />
                </div>

                <div className="portfolio-grid-2col">
                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">GitHub Profile URL</label>
                    <input
                      type="url"
                      className="portfolio-input"
                      placeholder="https://github.com/my-profile"
                      value={editGithub}
                      onChange={(e) => setEditGithub(e.target.value)}
                    />
                  </div>

                  <div className="portfolio-form-group">
                    <label className="portfolio-field-label">LinkedIn Profile URL</label>
                    <input
                      type="url"
                      className="portfolio-input"
                      placeholder="https://linkedin.com/in/my-profile"
                      value={editLinkedin}
                      onChange={(e) => setEditLinkedin(e.target.value)}
                    />
                  </div>
                </div>

                <div className="portfolio-modal-actions">
                  <button type="button" onClick={() => setShowProfileModal(false)} className="portfolio-modal-cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" className="portfolio-modal-submit-btn" disabled={savingProfile}>
                    {savingProfile ? 'Updating...' : 'Save Profile Changes ✨'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioBuilder;
