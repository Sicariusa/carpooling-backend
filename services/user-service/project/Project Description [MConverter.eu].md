Software Project II

TA. Menna Singergy

Spring 2025

**1 Project Overview**

**1.1**

**Description:**

**GIU Car Pooling System - **The GIU Car Pooling Application is a ride-sharing platform exclusively designed for students and staff at the German International University \(GIU\). The system allows users to offer rides from GIU to any destination and vise versa , helping to reduce commuting costs, improve travel efficiency, and encourage a more sustainable transportation option. The platform should enable users to:

• Offer and book rides between GIU and any destination

• Real-time ride tracking and status updates. 

• Secure online payments via Stripe. 

• Email and SMS confirmations via SendGrid. 

• ”Girls-Only Ride” feature for safety. 

• University authentication for students & staff \(Email or University ID verification\). 

**1.2**

**Team Formation:**

The team should consist of 5-6 members. It cannot be less than 5 or more than 6. 

**1.3**

**Technology, Architecture and Stack:**

The project will follow a Microservices Architecture with CQRS \(Command Query Responsibility Segregation\) for scal-ability and performance. It will be built using Next.js \(Frontend\) and NestJS \(Backend\) with GraphQL API, NeonDB

\(Serverless PostgreSQL\) for database management, and Prisma ORM \(Object-relational mapping\) for seamless interactions. **You will be using Trello/Jira for distributing the tasks among group members during the sprints. **

**1.4**

**Structure:**

The project is divided into **three milestones, covering UI design, backend development, and frontend integration. **

**2**

**Functional & Non-Functional Requirements** These are the main FR and NFR that **MUST **be fulfilled by the system. These requirements will be translated into user stories, which will then be divided into sprints for structured development.Each sprint will contain specific tasks derived from the user stories, and these tasks will be assigned to team members using a project management tool such as Jira or Trello. 

**Note: you can add additional FR and NFR if needed, but these are the essential ones. **

**2.1 Functional Requirements \(FRs\)**

**2.1.1**

**User Authentication & Management**

• The system shall allow passengers and drivers to register using GIU email or university ID. 

• The system shall enforce email/SMS verification before allowing users to book or offer rides. 

• The system shall allow admins to approve/reject driver registrations.why does every have to accept it on registeration

1

**2.1.2**

**Ride Booking & Management**

• The system shall allow passengers to search for rides either going to GIU or leaving from GIU. 

• The system shall allow passengers to filter for Girls-Only rides. 

• The system shall allow passengers to book a ride if seats are available. 

• The system shall allow passengers to modify their destination after booking a ride. 

• The system shall allow passengers to cancel their booking before a certain deadline. 

• The system shall notify drivers when a passenger books or cancels a ride. 

• The system shall allow drivers to offer rides \(from GIU to any destination or from any destination to GIU\). 

• The system shall allow drivers to set a ride as Girls-Only. 

• The system shall allow drivers to accept or reject booking requests from passengers. 

• The system shall allow passengers and drivers to view their ride history. 

**2.1.3 Payment Processing**

• The system shall allow passengers to pay for rides using Stripe. 

• The system shall track payment status for each ride. 

• The system shall allow admins to issue refunds if necessary. 

**2.1.4**

**Notifications & Communication**

• The system shall send confirmation emails/SMS for ride bookings, modifications, and cancellations using SendGrid. 

• The system shall send reminder notifications before the ride starts. 

• The system shall notify drivers if a passenger cancels a booking. 

**2.1.5**

**Admin Controls & System Management**

• The system shall allow admins to monitor all rides and bookings. 

• The system shall allow admins to handle complaints from passengers or drivers. 

• The system shall allow admins to view and manage payments and refunds. 

**2.2**

**Non-Functional Requirements \(NFRs\)**

**2.2.1**

**Performance & Scalability**

• The system shall handle multiple ride searches and bookings simultaneously without performance degradation. 

• The system shall process payments within 3 seconds for a smooth user experience. 

• The system shall be scalable to support hundreds of concurrent users. 

**2.2.2**

**Security & Data Protection**

• The system shall encrypt user passwords and store them securely. 

• The system shall implement role-based access control \(RBAC\): Only admins can approve drivers. Only verified users can book or offer rides. 

• The system shall prevent unauthorized modifications to rides or payments. 

**2.2.3**

**Usability & User Experience**

• The system shall have a responsive UI. 

• The system shall provide clear error messages for failed actions. 

• The system shall offer a simple and intuitive booking process. 

2

**2.3**

**Integration & Deployment**

• The system shall be deployable on cloud platforms like Vercel,Railway,or Fly.io . 

• The system shall integrate Kafka or RabbitMQ for real-time updates. 

**3**

**Milestone 1: UI/UX Design in Figma \(30%\)**

**3.1 Deadline**

*This milestone should be submitted before 28/2/2025*

**3.2**

**Objective**

Design a user-friendly interface in Figma, ensuring all interactions between the pages/UI components are shown. The design must incorporate all UI principles covered in the labs. 

**3.3**

**Requirements**

**3.3.1 Figma Design for Every Page:**

• User Authentication \(University ID verification\). 

• Dashboard \(Ride Listings\) – Only rides involving GIU \(either to or from GIU\). 

• Ride Booking Flow \(including ”Girls-Only Ride” filter\). 

• Ride Creation \(For Drivers, only for GIU-related routes\). 

• Payment & Booking Confirmation \(Stripe UI\). 

• Email & SMS Notification. 

• User Profile & Ride History. 

• Document stating what concepts you applied in each frame/page. 

**3.3.2**

**UI/UX Principles:**

• GIU branding colors and fonts. 

• Clear call-to-actions \(CTAs\). 

• Accessibility considerations. 

**3.4**

**Submission**

The submission will be through a google form where you will send a drive link that includes the figma design/prototype. 

**4**

**Milestone 2 : Backend Development & Service Integration \(40%\)** **4.1**

**Deadline:**

*This milestone should be submitted before 9/4/2025*

**4.2**

**Objective:**

This milestone focuses on building the backend architecture using NestJS with Microservices. It ensures efficient communication between services via Kafka or RabbitMQ, implements CQRS for better separation of concerns, and includes GraphQL API. 

3

**4.3**

**Requirements:**

**4.3.1**

**Microservices-Based Backend :**

The project should be divided into the following services:

• ***User Service: *** Manages authentication & university verification. Abdullah

• ***Ride Service: *** Handles ride creation \(only from GIU\). Mohamed

• ***Booking Service: *** Manages ride reservations. John

• ***Payment Service: *** Handles transactions securely by integrating Stripe API. Ahmed 

• ***Notification Service: *** Sends email/SMS notifications via SendGrid API. 

Note:

Mostafa

1. you can use a hybrid appproach where you can use GraphQL for the dynamic services and REST apis for static apis such as payment and notifications. 

2. you can use different technology for payment and notification services than the ones suggested, but most importantly get the job done :\)

**4.3.2 Database Setup \(NeonDB \+ Prisma\)**

You will setup your database \(neonDB\) along with Prisma. 

• PostgreSQL database with Prisma ORM. 

• Schema definitions for users, rides, bookings, and payments\(optional\). 

• Ride schema must enforce that all rides are either TO or FROM GIU. 

**4.3.3**

**GraphQL API with CQRS Implementation**

Create GraphQL queries to manage the retrieval and creation of objects. 

• Queries for fetching rides. 

• Mutations for creating and booking rides. 

**4.3.4**

**Message Broker for Service Communication**

• Kafka or RabbitMQ for event-driven interactions. 

• You will setup kafka by creating consumers and producers to subscribe and publish events. 

Example: When a ride is booked, a message is sent to update availability. 

**4.3.5**

**Stripe Payment Integration**

• Users can pay for rides securely using Stripe. 

• Drivers can receive payments. 

• Payment confirmation stored in the database. 

**4.3.6**

**SendGrid Email & SMS Integration**

• Users receive booking confirmations via email & SMS. 

• Ride status updates sent in real time. 

• Admin notifications for disputes or payment issues. 

**4.3.7**

**”Girls-Only Ride” Feature**

Riders can filter/search for women-only rides, and drivers can offer women-only rides. 

**4.3.8**

**Unit Testing**

Test a single module/service \(GraphQL resolvers and database operations\) 4

**4.4**

**Submission**

The submission will be through a google form too where you will submit the backend of your system through a zip folder. 

**4.5 Evaluation**

There will be an evalution for this milestone where you will receive feedbacks about the project. You will reserve slots based on a first-come first-serve basis. 

**5**

**Milestone 3: Frontend Implementation & Deployment \(30%\)** **5.1 Deadline:**

*This milestone should be submitted before 12/5/2025*

**5.2**

**Objective**

This milestone focuses on implementing the UI design \(from M1\) in Next.js, integrating it with the backend \(from M2\), and deploying the complete system. 

**5.3**

**Requirements**

**5.3.1 Frontend Implementation in Next.js**

• Convert Figma designs \(from M1\) into code using dev mode in Figma or plugins. 

• Implement the pages and their functionalities. 

• Optimize UI/UX for performance and responsiveness. 

**5.3.2**

**Integration with Backend \(NestJS\)**

• Connect Next.js frontend with GraphQL API. 

• Ensure proper state management and API communication. 

**5.3.3**

**Deployment**

• Deploy Project\(Vercel,Railway,or Fly.io\)

• Ensure the database \(NeonDB\) is accessible from deployed services. 

**5.3.4**

**Evaluation**

There will be a final evaluation for the whole project where you will show the full functionality of your system. Feedback should be taken into account. 

**6**

**Important Notes**

• AI-generated code is allowed, BUT you should understand the code. If not, a ZERO will be given in the whole project. 

• While you don’t have to use the recommended technology tools, you may opt for others as long as the required functionalities are met, especially for payment and notification services. 

• The suggested hosting and deployment sites are up to you. You can use whatever you prefer. 

• **This document might be updated; however, you will be informed whenever this happens. **

• If you reached this far, congratulations\! You are done with the first step towards completing this project :D\! Best of luck\! I’m excited to see your creativity in action\! You got this\! 

5



