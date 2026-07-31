import { useEffect, useState } from "react";
import api from "./api";
import { getErrorText, validateForm } from "./validator";
import "./App.css";


const taskFormRules = {
    title: { required: true, minLength: 2 },
    body: { required: true, minLength: 5 }
};


const validationConfig = {
    email: {
        required: true,
        regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    password: {
        required: true,
        minLength: 8,
        regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/
    },
    phone: {
        required: true,
        regex: /^\+?[0-9\s()\-]{7,}$/
    }
};


function App() {

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [showForm, setShowForm] = useState(false);
    const [formMode, setFormMode] = useState("add");
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [taskErrors, setTaskErrors] = useState({});
    const [taskForm, setTaskForm] = useState({
        title: "",
        body: ""
    });
    const [demoForm, setDemoForm] = useState({
        email: "",
        password: "",
        phone: ""
    });
    const [demoErrors, setDemoErrors] = useState({});
    const [demoMessage, setDemoMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const postsPerPage = 10;


    function formatTask(post) {

        return {
            id: post.id,
            title: post.title?.trim() || `Project Task ${post.id}`,
            body: post.body?.trim() || `Review project progress and complete the assigned work for Task ${post.id}.`
        };

    }


    function normalizeStoredTasks(tasks) {

        return tasks.map(task => ({
            ...task,
            title: task.title?.trim() || `Project Task ${task.id}`,
            body: task.body?.trim() || `Review project progress and complete the assigned work for Task ${task.id}.`
        }));

    }


    function persistTasks(updatedTasks) {

        localStorage.setItem("tasks", JSON.stringify(updatedTasks));

    }


    function getUniqueTaskId() {

        return Date.now() + Math.floor(Math.random() * 1000);

    }


    useEffect(() => {

        const savedPosts = localStorage.getItem("tasks");

        if (savedPosts) {

            const normalizedTasks = normalizeStoredTasks(JSON.parse(savedPosts));
            setPosts(normalizedTasks);
            persistTasks(normalizedTasks);
            setLoading(false);
            return;

        }


        api.get("/posts")
            .then(response => {

                const formattedTasks = response.data
                    .slice(0, 50)
                    .map(post => formatTask(post));

                setPosts(formattedTasks);
                persistTasks(formattedTasks);
                setLoading(false);

            })
            .catch(() => {
                setLoading(false);
            });

    }, []);


    function openAddTaskForm() {

        setSuccessMessage("");
        setFormMode("add");
        setEditingTaskId(null);
        setTaskErrors({});
        setTaskForm({ title: "", body: "" });
        setShowForm(true);

    }


    function openEditTaskForm(task) {

        setSuccessMessage("");
        setFormMode("edit");
        setEditingTaskId(task.id);
        setTaskErrors({});
        setTaskForm({
            title: task.title,
            body: task.body
        });
        setShowForm(true);

    }


    function closeTaskForm() {

        setShowForm(false);
        setFormMode("add");
        setEditingTaskId(null);
        setTaskErrors({});
        setTaskForm({ title: "", body: "" });

    }


    function saveTask(event) {

        event.preventDefault();

        const validationErrors = validateForm(taskForm, taskFormRules);
        setTaskErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            return;
        }

        const payload = {
            title: taskForm.title.trim(),
            body: taskForm.body.trim()
        };


        if (formMode === "edit" && editingTaskId !== null) {

            api.put(`/posts/${editingTaskId}`, payload)
                .then(response => {

                    const updatedTasks = posts.map(task => {

                        if (task.id === editingTaskId) {
                            return {
                                ...task,
                                title: response.data.title?.trim() || payload.title,
                                body: response.data.body?.trim() || payload.body
                            };
                        }

                        return task;

                    });

                    setPosts(updatedTasks);
                    persistTasks(updatedTasks);
                    closeTaskForm();

                })
                .catch(() => {

                    const updatedTasks = posts.map(task => {

                        if (task.id === editingTaskId) {
                            return {
                                ...task,
                                title: payload.title,
                                body: payload.body
                            };
                        }

                        return task;

                    });

                    setPosts(updatedTasks);
                    persistTasks(updatedTasks);
                    setSuccessMessage("Task edited successfully.");
                    closeTaskForm();

                });

        } else {

            api.post("/posts", payload)
                .then(response => {

                    const newTask = formatTask({
                        ...response.data,
                        title: response.data.title?.trim() || payload.title,
                        body: response.data.body?.trim() || payload.body
                    });
                    const updatedTasks = [newTask, ...posts];

                    setPosts(updatedTasks);
                    persistTasks(updatedTasks);
                    setSuccessMessage("Task added successfully.");
                    closeTaskForm();

                })
                .catch(() => {

                    const newTask = {
                        id: getUniqueTaskId(),
                        title: payload.title,
                        body: payload.body
                    };

                    const updatedTasks = [newTask, ...posts];

                    setPosts(updatedTasks);
                    persistTasks(updatedTasks);
                    setSuccessMessage("Task added successfully.");
                    closeTaskForm();

                });

        }

    }


    function deleteTask(id) {

        const confirmed = window.confirm("Are you sure you want to delete this task?");

        if (!confirmed) {
            return;
        }


        api.delete(`/posts/${id}`)
            .then(() => {

                const updatedTasks = posts.filter(task => task.id !== id);
                setPosts(updatedTasks);
                persistTasks(updatedTasks);

            })
            .catch(() => {

                const updatedTasks = posts.filter(task => task.id !== id);
                setPosts(updatedTasks);
                persistTasks(updatedTasks);

            });

    }


    function onDemoFieldChange(event) {

        const { name, value } = event.target;
        const nextForm = {
            ...demoForm,
            [name]: value
        };

        setDemoForm(nextForm);

        const nextErrors = validateForm(nextForm, validationConfig);
        setDemoErrors(nextErrors);

    }


    function submitDemoForm(event) {

        event.preventDefault();

        const errors = validateForm(demoForm, validationConfig);
        setDemoErrors(errors);

        if (Object.keys(errors).length > 0) {
            setDemoMessage("Please correct the validation errors.");
            return;
        }

        setDemoMessage("Validation passed successfully.");
        setDemoForm({ email: "", password: "", phone: "" });
        setDemoErrors({});

    }


    const filteredTasks = posts.filter(task => {

        const term = search.trim().toLowerCase();

        if (term === "") {
            return true;
        }

        const searchWords = term.split(/\s+/).filter(Boolean);
        const combinedText = `${task.title} ${task.body}`.toLowerCase();

        return searchWords.every(word => combinedText.includes(word));

    });


    const sortedTasks = [...filteredTasks].sort((a, b) => {

        if (sortBy === "oldest") {
            return a.id - b.id;
        }

        if (sortBy === "title") {
            return a.title.localeCompare(b.title);
        }

        return b.id - a.id;

    });


    const start = (page - 1) * postsPerPage;
    const currentTasks = sortedTasks.slice(start, start + postsPerPage);
    const totalPages = Math.max(1, Math.ceil(sortedTasks.length / postsPerPage));
    const hasSearchResults = search.trim() !== "" && sortedTasks.length === 0;


    return (

        <div className="container">


            <div className="header">

                <h1>Task Manager Dashboard</h1>
                <p>Manage your projects, track progress and organize your daily tasks.</p>

            </div>


            <div className="search-box">
                <input
                    type="text"
                    placeholder="Search tasks..."
                    value={search}
                    onChange={event => {
                        setSearch(event.target.value);
                        setPage(1);
                    }}
                />
            </div>


            {
                successMessage &&
                <div className="success-banner">{successMessage}</div>
            }


            <div className="toolbar">
                <button onClick={openAddTaskForm}>Add Task</button>

                <select
                    className="sort-select"
                    value={sortBy}
                    onChange={event => {
                        setSortBy(event.target.value);
                        setPage(1);
                    }}
                >
                    <option value="newest">Sort: Newest</option>
                    <option value="oldest">Sort: Oldest</option>
                    <option value="title">Sort: Title</option>
                </select>
            </div>


            {
                showForm && (
                    <div className="task-form-modal">
                        <div className="task-form">

                            <div className="task-form-header">
                                <h2>{formMode === "edit" ? "Edit Task" : "Add Task"}</h2>
                                <button type="button" className="close-btn" onClick={closeTaskForm}>
                                    ×
                                </button>
                            </div>

                            <form onSubmit={saveTask}>
                                <div className="form-group">
                                    <label htmlFor="taskTitle">Task Title (English)</label>
                                    <input
                                        id="taskTitle"
                                        type="text"
                                        placeholder="Enter the task title in English"
                                        value={taskForm.title}
                                        onChange={event => setTaskForm({ ...taskForm, title: event.target.value })}
                                    />
                                    {
                                        taskErrors.title &&
                                        <span className="error-text">{getErrorText(taskErrors.title)}</span>
                                    }
                                </div>

                                <div className="form-group">
                                    <label htmlFor="taskDescription">Brief Description (English)</label>
                                    <textarea
                                        id="taskDescription"
                                        rows="4"
                                        placeholder="Enter a brief task description in English"
                                        value={taskForm.body}
                                        onChange={event => setTaskForm({ ...taskForm, body: event.target.value })}
                                    />
                                    {
                                        taskErrors.body &&
                                        <span className="error-text">{getErrorText(taskErrors.body)}</span>
                                    }
                                </div>

                                <div className="form-actions">
                                    <button type="submit">
                                        {formMode === "edit" ? "Update Task" : "Save Task"}
                                    </button>
                                    <button type="button" className="secondary" onClick={closeTaskForm}>
                                        Cancel
                                    </button>
                                </div>
                            </form>

                        </div>
                    </div>
                )
            }


            <div className="validator-card">
                <h2>Dynamic Form Validator Demo</h2>
                <p>Use the configuration object and field rules to validate email, password, and phone number instantly.</p>

                <form className="demo-form" onSubmit={submitDemoForm}>
                    <div className="form-group">
                        <label htmlFor="demoEmail">Email</label>
                        <input
                            id="demoEmail"
                            name="email"
                            type="email"
                            placeholder="Enter your email"
                            value={demoForm.email}
                            onChange={onDemoFieldChange}
                        />
                        {
                            demoErrors.email &&
                            <span className="error-text">{getErrorText(demoErrors.email)}</span>
                        }
                    </div>

                    <div className="form-group">
                        <label htmlFor="demoPassword">Password</label>
                        <input
                            id="demoPassword"
                            name="password"
                            type="password"
                            placeholder="Use upper, lower, number, and symbol"
                            value={demoForm.password}
                            onChange={onDemoFieldChange}
                        />
                        {
                            demoErrors.password &&
                            <span className="error-text">{getErrorText(demoErrors.password)}</span>
                        }
                    </div>

                    <div className="form-group">
                        <label htmlFor="demoPhone">Phone Number</label>
                        <input
                            id="demoPhone"
                            name="phone"
                            type="text"
                            placeholder="Enter a phone number"
                            value={demoForm.phone}
                            onChange={onDemoFieldChange}
                        />
                        {
                            demoErrors.phone &&
                            <span className="error-text">{getErrorText(demoErrors.phone)}</span>
                        }
                    </div>

                    <div className="form-actions">
                        <button type="submit">Validate Form</button>
                    </div>

                    {
                        demoMessage &&
                        <p className="success-text">{demoMessage}</p>
                    }
                </form>
            </div>


            {
                loading ?

                    <h2>Loading tasks...</h2>

                : hasSearchResults ? (

                    <div className="empty-state">
                        <h3>Task not found</h3>
                        <p>No task matches your search right now.</p>
                    </div>

                ) : (

                    currentTasks.map(task => (

                        <div className="card" key={task.id}>

                            <h3>{task.title}</h3>
                            <p>{task.body}</p>

                            <div className="actions">
                                <button className="edit" onClick={() => openEditTaskForm(task)}>
                                    Edit Task
                                </button>

                                <button className="delete" onClick={() => deleteTask(task.id)}>
                                    Delete
                                </button>
                            </div>

                        </div>

                    ))

                )

            }


            <div className="pagination">

                <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                >
                    Previous
                </button>

                <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                >
                    Next
                </button>

            </div>


        </div>

    );


}


export default App;