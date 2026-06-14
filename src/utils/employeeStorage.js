// Lightweight client-side data layer for the Employee Management module (Phase 1).
// Acts as a stand-in for the backend API until Phase 2 integration is available.

const STORAGE_KEY = 'ajkpsc_employees_demo';

export const DEFAULT_PASSWORD = '12345678';

const SEED_EMPLOYEES = [
  {
    id: 'emp-1001',
    full_name: 'Ahmed Raza',
    cnic: '13101-1234567-1',
    email: 'ahmed.raza@example.com',
    father_husband_name: 'Muhammad Raza',
    dob: '1992-04-15',
    gender: 'Male',
    mobile: '0300-1234567',
    domicile_district: 'Muzaffarabad',
    status: 'active',
  },
  {
    id: 'emp-1002',
    full_name: 'Sara Khalid',
    cnic: '13101-7654321-2',
    email: 'sara.khalid@example.com',
    father_husband_name: 'Khalid Mahmood',
    dob: '1995-09-02',
    gender: 'Female',
    mobile: '0301-2345678',
    domicile_district: 'Mirpur',
    status: 'active',
  },
  {
    id: 'emp-1003',
    full_name: 'Bilal Hussain',
    cnic: '13101-9876543-3',
    email: 'bilal.hussain@example.com',
    father_husband_name: 'Hussain Ahmed',
    dob: '1989-12-21',
    gender: 'Male',
    mobile: '0302-3456789',
    domicile_district: 'Bagh',
    status: 'inactive',
  },
];

export const getEmployees = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_EMPLOYEES));
  return SEED_EMPLOYEES;
};

const saveEmployees = (employees) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
  return employees;
};

export const addEmployee = (employee) => {
  const employees = getEmployees();
  const newEmployee = {
    id: `emp-${Date.now()}`,
    status: 'active',
    ...employee,
  };
  saveEmployees([newEmployee, ...employees]);
  return newEmployee;
};

export const toggleEmployeeStatus = (id) => {
  const employees = getEmployees().map((emp) =>
    emp.id === id
      ? { ...emp, status: emp.status === 'active' ? 'inactive' : 'active' }
      : emp
  );
  return saveEmployees(employees);
};
